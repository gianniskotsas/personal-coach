import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { registerCommand } from "../index";
import { saveConfig, configPath } from "../config";

const DEFAULT_URL = "https://coach.kotsas.com";

async function prompt(question: string, hidden = false): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  if (!hidden) {
    const answer = await rl.question(question);
    rl.close();
    return answer.trim();
  }
  // Hidden input: mute echo so the pasted key never shows on screen or scrollback.
  const output = stdout as typeof stdout & { _writeToOutput?: (s: string) => void };
  const orig = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
  (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
    if (s.includes("\n") || s.includes("\r")) output.write(s);
  };
  stdout.write(question);
  const answer = await rl.question("");
  (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = orig;
  stdout.write("\n");
  rl.close();
  return answer.trim();
}

async function runLogin(args: string[]) {
  const { values } = parseArgs({
    args,
    options: { url: { type: "string" }, key: { type: "string" } },
    allowPositionals: false,
  });

  // Precedence for each field: flag → env → interactive prompt.
  const url =
    values.url || process.env.COACH_MEMORY_URL || (await prompt(`Server URL [${DEFAULT_URL}]: `)) || DEFAULT_URL;
  const apiKey =
    values.key || process.env.COACH_SYNC_API_KEY || (await prompt("API key (hidden): ", true));

  if (!apiKey) throw new Error("no API key provided");

  // Verify before persisting — a bad key should fail loudly here, not silently on
  // the next routine run. status is a read-only, side-effect-free check.
  const res = await fetch(new URL("/api/cli/status", url), { headers: { "x-api-key": apiKey } });
  if (!res.ok) {
    throw new Error(`credentials rejected by ${url} (HTTP ${res.status}) — nothing saved`);
  }

  const path = saveConfig({ url, apiKey });
  console.log(`Verified and saved credentials for ${url} → ${path}`);
  console.log("The CLI will now authenticate automatically; no need to set env vars.");
}

registerCommand("login", runLogin);
