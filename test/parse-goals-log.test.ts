import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseGoalsLog } from "@/lib/ingest/parse-goals-log";

const text = readFileSync("test/fixtures/goals-log.sample.json", "utf8");

describe("parseGoalsLog", () => {
  it("emits one document per daily entry with per-entry hash", () => {
    const docs = parseGoalsLog(text, "state/goals-log.json");
    expect(docs.length).toBe(2);
    expect(docs[0].docType).toBe("daily_entry");
    expect(docs[0].periodStart).toBe("2026-04-01");
    expect(docs[0].contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(docs[0].contentHash).not.toBe(docs[1].contentHash);
  });
  it("explodes activities with workstream and collaborators", () => {
    const [doc] = parseGoalsLog(text, "state/goals-log.json");
    const a = doc.activities.find((x) => x.name.startsWith("Cash balances"));
    expect(a).toBeDefined();
    expect(a!.workstream).toBe("product");
    expect(a!.collaborators).toContain("Tom Thorn");
    expect(a!.date).toBe("2026-04-01");
  });
  it("is stable: same input → same hashes", () => {
    const h1 = parseGoalsLog(text, "p")[0].contentHash;
    const h2 = parseGoalsLog(text, "p")[0].contentHash;
    expect(h1).toBe(h2);
  });
  it("parses flags in both string and object form", () => {
    const synthetic = JSON.stringify({
      entries: [{
        date: "2026-04-03",
        headline: "test",
        workstreams: {},
        flags: [
          "plain string flag",
          { flag: "overcommitted", severity: "high", note: "too many meetings" },
        ],
      }],
    });
    const [doc] = parseGoalsLog(synthetic, "state/goals-log.json");
    expect(doc.flags).toEqual([
      { date: "2026-04-03", flag: "plain string flag", severity: null, note: null },
      { date: "2026-04-03", flag: "overcommitted", severity: "high", note: "too many meetings" },
    ]);
  });
  it("disambiguates two same-named activities in one workstream so the (date, workstream, name) tuple stays unique", () => {
    const synthetic = JSON.stringify({
      entries: [{
        date: "2026-04-04",
        headline: "test",
        workstreams: {
          product: {
            percent_energy: 50,
            activities: [
              { name: "untitled" },
              { name: "untitled" },
            ],
          },
        },
        flags: [],
      }],
    });
    const [doc] = parseGoalsLog(synthetic, "state/goals-log.json");
    expect(doc.activities).toHaveLength(2);
    const names = doc.activities.map((a) => a.name);
    expect(new Set(names).size).toBe(2);
    expect(names).toEqual(["untitled", "untitled (2)"]);
  });

  it("skips weekly-summary entries interleaved in the log (no date field)", () => {
    const mixed = JSON.stringify({
      entries: [
        { date: "2026-04-01", headline: "a day", workstreams: {}, flags: [] },
        { tier: "weekly", week_start: "2026-04-01", week_end: "2026-04-05", center_of_gravity: "product" },
        { date: "2026-04-02", headline: "another day", workstreams: {}, flags: [] },
      ],
    });
    const docs = parseGoalsLog(mixed, "state/goals-log.json");
    expect(docs).toHaveLength(2);
    expect(docs.map((d) => d.periodStart)).toEqual(["2026-04-01", "2026-04-02"]);
    expect(docs.every((d) => d.docType === "daily_entry" && d.periodStart)).toBe(true);
  });
});
