import { readFileSync } from "node:fs";
import { join, relative, isAbsolute } from "node:path";
import { registerCommand } from "../index";
import { resolveUrl, resolveKey } from "../config";
import { runSync, defaultStateDir } from "../../sync/sync";

function singleFileEntry(fileArg: string): { path: string; content: string } {
  const dir = defaultStateDir();
  const absPath = isAbsolute(fileArg) ? fileArg : join(process.cwd(), fileArg);
  const relPath = relative(dir, absPath);
  if (relPath.startsWith("..")) {
    throw new Error(`${fileArg} is not inside ${dir} — ingest expects a file under career-coach/state/`);
  }
  return { path: relPath, content: readFileSync(absPath, "utf8") };
}

async function runIngest(args: string[]) {
  // runSync reads credentials from process.env; backfill them from the persisted
  // login so `personal-coach login` once is enough (no env vars, no secret in the
  // routine). Env vars, if already set, win — resolveUrl/resolveKey check them first.
  const url = resolveUrl();
  const key = resolveKey();
  if (url) process.env.COACH_MEMORY_URL = url;
  if (key) process.env.COACH_SYNC_API_KEY = key;

  const files = args[0] ? [singleFileEntry(args[0])] : undefined;
  await runSync({ files, verbose: true });
}

registerCommand("ingest", runIngest);
