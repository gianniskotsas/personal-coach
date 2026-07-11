import { Pool, types } from "pg";

// bigint (OID 20): our GENERATED-IDENTITY ids never approach 2^53, so Number is safe and makes `id: number` types honest
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on("error", (err) => console.error("pg pool error", err));

export async function query<T = Record<string, unknown>>(
  text: string, params: unknown[] = []
): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}
