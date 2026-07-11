import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseFile } from "@/lib/ingest/parse-file";

describe("parseFile", () => {
  it("routes goals-log.json to daily entries", () => {
    const docs = parseFile("state/goals-log.json", readFileSync("test/fixtures/goals-log.sample.json", "utf8"));
    expect(docs.every((d) => d.docType === "daily_entry")).toBe(true);
  });
  it("parses weekly report with period bounds and no activities", () => {
    const [doc] = parseFile("state/weeks/week-2026-06-15.json", readFileSync("test/fixtures/week.sample.json", "utf8"));
    expect(doc.docType).toBe("weekly_report");
    expect(doc.periodStart).toBe("2026-06-15");
    expect(doc.periodEnd).toBe("2026-06-19");
    expect(doc.activities).toEqual([]);
    expect(doc.raw).toBeTruthy();
  });
  it("parses quarterly markdown with quarter-derived period", () => {
    const [doc] = parseFile("state/quarterly-brief-2026-Q2.md", readFileSync("test/fixtures/quarterly.sample.md", "utf8"));
    expect(doc.docType).toBe("quarterly_brief");
    expect(doc.periodStart).toBe("2026-04-01");
    expect(doc.bodyMd).toContain("#");
  });
  it("parses redflags singleton with earliest-date period", () => {
    const [doc] = parseFile("state/redflags-log.md", "## Flags\n- 2026-05-02 something\n- 2026-04-15 earlier\n");
    expect(doc.docType).toBe("redflags");
    expect(doc.periodStart).toBe("2026-04-15");
  });
  it("skips unknown files", () => {
    expect(parseFile("state/state.json", "{}")).toEqual([]);
  });
  it("routes self-reflection quarterly file, excludes design/context siblings", () => {
    const md = "# Self Reflection\ncontent";
    expect(parseFile("state/self-reflection-2026-Q2.md", md)[0].docType).toBe("self_reflection");
    expect(parseFile("state/self-reflection-2026-Q2.md", md)[0].periodStart).toBe("2026-04-01");
    expect(parseFile("state/self-reflection-2026-Q2-design.md", md)).toEqual([]);
    expect(parseFile("state/self-reflection-2026-Q2-context.md", md)).toEqual([]);
  });
  it("routes quarterly-questions", () => {
    const [doc] = parseFile("state/quarterly-questions-2026-Q2.md", "# Q\n?");
    expect(doc.docType).toBe("quarterly_questions");
    expect(doc.periodStart).toBe("2026-04-01");
  });
  it("routes content-log singleton with earliest-date period", () => {
    const [doc] = parseFile("state/content-log.md", "## log\n- 2026-05-10 x\n- 2026-04-20 earlier\n");
    expect(doc.docType).toBe("content_log");
    expect(doc.periodStart).toBe("2026-04-20");
  });
  it("skips backfill-test and notes-log files", () => {
    expect(parseFile("state/_backfill-test-2026-W25.md", "x")).toEqual([]);
    expect(parseFile("state/notes-log.json", '{"notes":[]}')).toEqual([]);
  });
});
