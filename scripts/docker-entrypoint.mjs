// Production container entrypoint: applies the (idempotent) schema, then execs the Next.js
// standalone server. Lets Coolify's docker-compose deploy skip the "open a shell and run
// npm run migrate" manual step — safe to run on every boot/restart.
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { Pool } from "pg";

async function waitForDb(pool, attempts = 30, delayMs = 2000) {
  for (let i = 0; i < attempts; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err) {
      if (i === attempts - 1) throw err;
      console.log(`database not ready yet, retrying (${i + 1}/${attempts})...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await waitForDb(pool);

const schemaSql = readFileSync(new URL("../lib/schema.sql", import.meta.url), "utf8");
await pool.query(schemaSql);
console.log("schema applied");

const authSchemaSql = readFileSync(new URL("../lib/auth-schema.sql", import.meta.url), "utf8");
await pool.query(authSchemaSql);
console.log("auth schema applied");

await pool.end();

const child = spawn(process.execPath, ["server.js"], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
