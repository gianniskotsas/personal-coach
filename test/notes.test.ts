import { describe, it, expect, beforeAll } from "vitest";
import { query } from "@/lib/db";
import { createNote, listNotes } from "@/lib/notes";
import { fakeEmbed } from "./helpers/fake-embed";

beforeAll(async () => {
  await query("TRUNCATE notes RESTART IDENTITY CASCADE");
});

describe("notes", () => {
  it("creates a note with an embedded chunk", async () => {
    const note = await createNote(
      { text: "Concern: too little energy on public building", noteType: "concern", tags: ["publicbuilding"], source: "test" },
      { embed: fakeEmbed });
    expect(note.id).toBeGreaterThan(0);
    expect(typeof note.id).toBe("number");
    expect(typeof note.created_at).toBe("string");
    expect(Number.isNaN(Date.parse(note.created_at))).toBe(false);
    const rows = await query<{ n: string }>(
      "SELECT count(*) n FROM chunks WHERE note_id=$1 AND embedding IS NOT NULL AND source_type='note'", [note.id]);
    expect(Number(rows[0].n)).toBe(1);
  });
  it("filters by since / type / tags", async () => {
    await createNote({ text: "Idea: coach mobile capture", noteType: "idea" }, { embed: fakeEmbed });
    expect((await listNotes({ noteType: "concern" })).map((n) => n.note_type)).toEqual(["concern"]);
    expect((await listNotes({ tags: ["publicbuilding"] }))).toHaveLength(1);
    expect((await listNotes({ since: "2100-01-01" }))).toHaveLength(0);
    expect((await listNotes({}))).toHaveLength(2);
  });
});
