#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const entry = join(__dirname, "..", "cli", "index.ts");
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", entry, ...process.argv.slice(2)],
  { stdio: "inherit", cwd: join(__dirname, "..") }
);
process.exit(result.status ?? 1);
