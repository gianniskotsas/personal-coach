import { describe, it, expect } from "vitest";
import { query } from "@/lib/db";

describe("db", () => {
  it("runs parameterized queries", async () => {
    const rows = await query<{ sum: number }>("SELECT $1::int + 1 AS sum", [41]);
    expect(rows[0].sum).toBe(42);
  });
  it("round-trips a vector literal", async () => {
    const v = JSON.stringify([1, 0, 0]);
    const rows = await query<{ d: number }>(
      "SELECT $1::vector(3) <=> $2::vector(3) AS d", [v, v]);
    expect(Number(rows[0].d)).toBe(0);
  });
});
