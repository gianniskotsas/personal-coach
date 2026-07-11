import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { query } from "@/lib/db";
import { ingestFiles } from "@/lib/ingest/ingest";
import { getContext } from "@/lib/context";
import { runReadOnlySql } from "@/lib/run-sql";
import { personHistory } from "@/lib/people";
import { getSyncStatus } from "@/lib/sync-status";
import { fakeEmbed } from "./helpers/fake-embed";

beforeAll(async () => {
  await query("TRUNCATE documents, notes RESTART IDENTITY CASCADE");
  await ingestFiles([
    { path: "state/goals-log.json", content: readFileSync("test/fixtures/goals-log.sample.json", "utf8") },
    { path: "state/weeks/week-2026-06-15.json", content: readFileSync("test/fixtures/week.sample.json", "utf8") },
  ], { embed: fakeEmbed });
});

describe("getContext", () => {
  it("day slice returns that daily entry", async () => {
    const ctx = await getContext({ type: "day", start: "2026-04-01" });
    expect(ctx.dailies).toHaveLength(1);
  });
  it("week slice returns dailies in range + weekly report", async () => {
    const ctx = await getContext({ type: "week", start: "2026-06-15" });
    expect(ctx.weeklies).toHaveLength(1);
  });
  it("quarter slice returns weeklies within the quarter", async () => {
    const ctx = await getContext({ type: "quarter", start: "2026-04-01" });
    expect(ctx.weeklies).toHaveLength(1);
  });
});

describe("runReadOnlySql", () => {
  it("runs a SELECT and caps rows", async () => {
    const res = await runReadOnlySql("SELECT date, workstream FROM activities");
    expect(res.rowCount).toBeGreaterThan(0);
  });
  it("allows WITH queries", async () => {
    const res = await runReadOnlySql("WITH x AS (SELECT 1 AS a) SELECT * FROM x");
    expect(res.rowCount).toBe(1);
  });
  it.each(["DELETE FROM notes", "SELECT 1; DROP TABLE notes", "UPDATE documents SET raw=null", "INSERT INTO flags VALUES (1)"])(
    "rejects %s", async (sql) => {
      await expect(runReadOnlySql(sql)).rejects.toThrow(/read-only violation/);
    });
  it.each(["SELECT pg_notify('chan','payload')", "SELECT nextval('some_seq')", "SELECT set_config('x', 'y', false)"])(
    "rejects read-only-permitted side-effecting function %s", async (sql) => {
      await expect(runReadOnlySql(sql)).rejects.toThrow(/read-only violation/);
    });
  it.each(['SELECT * FROM session', 'SELECT key FROM apikey', 'SELECT * FROM "user"'])(
    "rejects access to auth table via %s", async (sql) => {
      await expect(runReadOnlySql(sql)).rejects.toThrow(/read-only violation/);
    });
  it("still allows normal SELECT over coach tables", async () => {
    const res = await runReadOnlySql("SELECT date, workstream FROM activities");
    expect(res.rowCount).toBeGreaterThan(0);
  });
});

describe("personHistory", () => {
  it("finds activities by collaborator, partial match", async () => {
    const rows = await personHistory("Tom");
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe("getSyncStatus", () => {
  it("reports per-doc_type freshness", async () => {
    const status = await getSyncStatus();
    const types = status.map((s) => s.doc_type);
    expect(types).toContain("daily_entry");
    expect(types).toContain("weekly_report");
  });

  it("does not include a phantom note row when notes is empty", async () => {
    await query("TRUNCATE notes CASCADE");
    const status = await getSyncStatus();
    const types = status.map((s) => s.doc_type);
    expect(types).not.toContain("note");
  });

  it("includes a note row once a note exists", async () => {
    await query(
      `INSERT INTO notes (note_type, text, tags, source) VALUES ('thought', 'test note', '{}', 'test')`);
    const status = await getSyncStatus();
    const types = status.map((s) => s.doc_type);
    expect(types).toContain("note");
  });
});
