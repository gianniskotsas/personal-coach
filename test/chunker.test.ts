import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildChunks } from "@/lib/ingest/chunker";
import { parseFile } from "@/lib/ingest/parse-file";

describe("buildChunks", () => {
  it("daily entry → headline + one chunk per activity", () => {
    const [doc] = parseFile("state/goals-log.json", readFileSync("test/fixtures/goals-log.sample.json", "utf8"));
    const chunks = buildChunks(doc);
    expect(chunks.filter((c) => c.chunkType === "headline")).toHaveLength(1);
    expect(chunks.filter((c) => c.chunkType === "activity")).toHaveLength(doc.activities.length);
    const a = chunks.find((c) => c.text.includes("Cash balances"));
    expect(a!.text).toContain("2026-04-01");
    expect(a!.text).toContain("Tom Thorn");
    expect(a!.workstream).toBe("product");
    expect(a!.activityKey).toEqual({
      date: "2026-04-01",
      workstream: "product",
      name: "Cash balances page redesign — flat table + bar chart concept",
    });
  });
  it("weekly report → section chunks, no daily_entries chunk", () => {
    const [doc] = parseFile("state/weeks/week-2026-06-15.json", readFileSync("test/fixtures/week.sample.json", "utf8"));
    const chunks = buildChunks(doc);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((c) => c.chunkType === "weekly_section")).toBe(true);
    expect(chunks.some((c) => c.text.includes("daily_entries"))).toBe(false);
    expect(chunks.every((c) => c.text.length <= 2400)).toBe(true);
    expect(chunks.some((c) => c.text.includes("one_next_action"))).toBe(true);
    expect(chunks.some((c) => c.text.includes("flags_fired_this_week"))).toBe(true);
  });
  it("markdown → heading chunks, none over 2400 chars", () => {
    const [doc] = parseFile("state/quarterly-brief-2026-Q2.md", readFileSync("test/fixtures/quarterly.sample.md", "utf8"));
    const chunks = buildChunks(doc);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.text.length <= 2400)).toBe(true);
    expect(chunks.every((c) => c.chunkType === "md_chunk")).toBe(true);
  });
});
