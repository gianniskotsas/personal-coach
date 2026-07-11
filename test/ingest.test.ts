import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { query, pool } from "@/lib/db";
import { ingestFiles } from "@/lib/ingest/ingest";
import { fakeEmbed } from "./helpers/fake-embed";

const goalsLog = readFileSync("test/fixtures/goals-log.sample.json", "utf8");

beforeAll(async () => {
  await query("TRUNCATE documents, notes RESTART IDENTITY CASCADE");
});

describe("ingestFiles", () => {
  it("inserts documents, activities, and embedded chunks", async () => {
    const results = await ingestFiles(
      [{ path: "state/goals-log.json", content: goalsLog }], { embed: fakeEmbed });
    expect(results.every((r) => r.status === "inserted")).toBe(true);
    const [docs] = await query<{ n: string }>("SELECT count(*) n FROM documents");
    expect(Number(docs.n)).toBe(2);
    const [acts] = await query<{ n: string }>("SELECT count(*) n FROM activities");
    expect(Number(acts.n)).toBeGreaterThan(0);
    const [noEmb] = await query<{ n: string }>("SELECT count(*) n FROM chunks WHERE embedding IS NULL");
    expect(Number(noEmb.n)).toBe(0);
    const [linked] = await query<{ n: string }>(
      "SELECT count(*) n FROM chunks WHERE chunk_type='activity' AND activity_id IS NULL");
    expect(Number(linked.n)).toBe(0);
  });
  it("second run is a no-op (per-entry hashing)", async () => {
    const results = await ingestFiles(
      [{ path: "state/goals-log.json", content: goalsLog }], { embed: fakeEmbed });
    expect(results.every((r) => r.status === "unchanged")).toBe(true);
  });
  it("changed entry → updated, others unchanged", async () => {
    const mutated = JSON.parse(goalsLog);
    mutated.entries[0].headline = "CHANGED HEADLINE";
    const results = await ingestFiles(
      [{ path: "state/goals-log.json", content: JSON.stringify(mutated) }], { embed: fakeEmbed });
    expect(results.map((r) => r.status).sort()).toEqual(["unchanged", "updated"]);
  });
});
