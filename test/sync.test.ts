import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectFiles, appendNotesToMirror } from "@/sync/sync";

function makeStateDir() {
  const dir = mkdtempSync(join(tmpdir(), "coach-state-"));
  writeFileSync(join(dir, "goals-log.json"), '{"entries":[]}');
  writeFileSync(join(dir, "redflags-log.md"), "# flags");
  writeFileSync(join(dir, "_backfill-test.md"), "skip me");
  writeFileSync(join(dir, "state.json"), "{}");
  writeFileSync(join(dir, "notes-log.json"), '{"notes":[]}');
  mkdirSync(join(dir, "weeks"));
  writeFileSync(join(dir, "weeks", "week-2026-06-15.json"), '{"week_start":"2026-06-15"}');
  return dir;
}

describe("collectFiles", () => {
  it("collects md/json incl. weeks, skips underscore/state/notes-log", () => {
    const files = collectFiles(makeStateDir());
    const names = files.map((f) => f.path).sort();
    expect(names).toEqual(["goals-log.json", "redflags-log.md", "weeks/week-2026-06-15.json"]);
  });
});

describe("appendNotesToMirror", () => {
  it("creates mirror, appends only new note ids", () => {
    const dir = makeStateDir();
    const mirror = join(dir, "notes-log.json");
    const n1 = { id: 1, created_at: "2026-07-11T10:00:00Z", note_type: "thought", text: "a", tags: [], source: "mcp" };
    const n2 = { ...n1, id: 2, text: "b" };
    expect(appendNotesToMirror(mirror, [n1, n2])).toBe(2);
    expect(appendNotesToMirror(mirror, [n2])).toBe(0);
    const stored = JSON.parse(readFileSync(mirror, "utf8"));
    expect(stored.notes).toHaveLength(2);
  });
});
