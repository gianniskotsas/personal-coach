import { pool } from "./db";

// Guard behind the MCP `run_sql` tool. Must reject anything that is not a single
// read-only SELECT/WITH statement. Do NOT loosen this — it is security-critical.
const FORBIDDEN =
  /\b(insert|update|delete|drop|alter|create|grant|revoke|truncate|copy|vacuum|do|call|execute|set|listen|unlisten|notify)\b/i;

// Functions that Postgres PERMITS inside a `BEGIN READ ONLY` transaction and whose names slip the
// FORBIDDEN keyword regex (e.g. `pg_notify` — the `_` is a word char so `\bnotify\b` never matches).
// These have side effects (notifications, sequence mutation, advisory locks, config changes,
// filesystem/network reads) and must be rejected explicitly. Do NOT remove.
const FORBIDDEN_FUNCS =
  /\b(pg_notify|nextval|setval|pg_advisory_lock|pg_advisory_unlock|pg_advisory_xact_lock|set_config|pg_read_file|pg_read_binary_file|pg_sleep|dblink)\b/i;

// better-auth tables share this database. run_sql is exposed to MCP clients and must never be
// able to read credentials/tokens/keys from them. Reject any query that references these tables
// by name, regardless of quoting/case. Our coach tables (documents/activities/chunks/flags/notes)
// never need these words, so this has no legitimate false positives.
const FORBIDDEN_TABLES =
  /\b(user|session|account|verification|apikey|oauthapplication|oauthaccesstoken|oauthconsent|jwks)\b/i;

export async function runReadOnlySql(sql: string): Promise<{ rows: unknown[]; rowCount: number }> {
  const cleaned = sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim()
    .replace(/;+\s*$/, "");

  if (cleaned.includes(";")) throw new Error("read-only violation: single statement only");
  if (!/^\s*(select|with)\b/i.test(cleaned))
    throw new Error("read-only violation: must start with SELECT or WITH");
  if (FORBIDDEN.test(cleaned) || FORBIDDEN_FUNCS.test(cleaned))
    throw new Error("read-only violation: forbidden keyword or function");
  if (FORBIDDEN_TABLES.test(cleaned))
    throw new Error("read-only violation: forbidden table");

  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = 5000");
    const res = await client.query(`SELECT * FROM (${cleaned}) _q LIMIT 500`);
    await client.query("COMMIT");
    return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    if (e instanceof Error && e.message.startsWith("read-only violation")) throw e;
    throw new Error(`read-only violation or SQL error: ${String(e)}`);
  } finally {
    client.release();
  }
}
