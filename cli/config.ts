import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

// Persisted CLI credentials, so `personal-coach login` once means access persists
// and no secret ever needs to live in a routine prompt or shell profile. Mirrors
// the gh/aws pattern: a 0600 JSON file under the user's config dir.
export type CoachConfig = { url?: string; apiKey?: string };

export function configPath(): string {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "personal-coach", "config.json");
}

export function loadConfig(): CoachConfig {
  try {
    return JSON.parse(readFileSync(configPath(), "utf8")) as CoachConfig;
  } catch {
    return {}; // missing or unreadable → treat as no stored config
  }
}

export function saveConfig(cfg: CoachConfig): string {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  return path;
}

// Resolution precedence: environment variable first (so CI/tests/one-off overrides
// win), then the persisted login. Returns undefined if neither provides a value.
export function resolveUrl(): string | undefined {
  return process.env.COACH_MEMORY_URL || loadConfig().url;
}

export function resolveKey(): string | undefined {
  return process.env.COACH_SYNC_API_KEY || loadConfig().apiKey;
}
