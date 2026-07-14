import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveConfig, loadConfig, resolveUrl, resolveKey } from "../cli/config";

// Isolate the config file into a temp XDG dir per test so we never touch the real
// ~/.config/personal-coach. Import fresh each time so module-level reads see env.
let dir: string;
const envKeys = ["XDG_CONFIG_HOME", "COACH_MEMORY_URL", "COACH_SYNC_API_KEY"];
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(envKeys.map((k) => [k, process.env[k]]));
  dir = mkdtempSync(join(tmpdir(), "pc-cfg-"));
  process.env.XDG_CONFIG_HOME = dir;
  delete process.env.COACH_MEMORY_URL;
  delete process.env.COACH_SYNC_API_KEY;
});

afterEach(() => {
  for (const k of envKeys) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k]!;
  }
  rmSync(dir, { recursive: true, force: true });
});

describe("cli config", () => {
  it("round-trips saved credentials and resolves from the file", () => {
    const path = saveConfig({ url: "https://coach.example.com", apiKey: "secret-key" });
    expect(existsSync(path)).toBe(true);
    expect(loadConfig()).toEqual({ url: "https://coach.example.com", apiKey: "secret-key" });
    expect(resolveUrl()).toBe("https://coach.example.com");
    expect(resolveKey()).toBe("secret-key");
  });

  it("writes the config file with 0600 permissions", () => {
    const path = saveConfig({ url: "u", apiKey: "k" });
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it("returns empty config and undefined resolves when nothing is stored", () => {
    expect(loadConfig()).toEqual({});
    expect(resolveUrl()).toBeUndefined();
    expect(resolveKey()).toBeUndefined();
  });

  it("prefers environment variables over the stored file", () => {
    saveConfig({ url: "https://file.example.com", apiKey: "file-key" });
    process.env.COACH_MEMORY_URL = "https://env.example.com";
    process.env.COACH_SYNC_API_KEY = "env-key";
    expect(resolveUrl()).toBe("https://env.example.com");
    expect(resolveKey()).toBe("env-key");
  });
});
