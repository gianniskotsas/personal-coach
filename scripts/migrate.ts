import { readFileSync } from "node:fs";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const schemaSql = readFileSync(new URL("../lib/schema.sql", import.meta.url), "utf8");
await pool.query(schemaSql);
console.log("schema applied");

const authSchemaSql = readFileSync(new URL("../lib/auth-schema.sql", import.meta.url), "utf8");
await pool.query(authSchemaSql);
console.log("auth schema applied");

await pool.end();
