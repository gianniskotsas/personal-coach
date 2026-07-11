import { describe, it, expect, beforeAll } from "vitest";
import { query } from "@/lib/db";
import { hybridSearch } from "@/lib/search";
import { createNote } from "@/lib/notes";
import { fakeEmbed } from "./helpers/fake-embed";

beforeAll(async () => {
  await query("TRUNCATE documents, notes RESTART IDENTITY CASCADE");
  // lexical-only target: rare proper noun, embedded with unrelated fake vector
  await createNote({ text: "Kicked off the Northbridge BigQuery integration", noteType: "thought" }, { embed: fakeEmbed });
  // vector target: fakeEmbed is deterministic, so querying the exact text ranks it #1 on the vector leg
  await createNote({ text: "Worried about spending too little energy on public building", noteType: "concern" }, { embed: fakeEmbed });
});

describe("hybridSearch", () => {
  it("lexical leg finds rare proper nouns", async () => {
    const hits = await hybridSearch({ query: "Northbridge" }, { embed: fakeEmbed });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].text).toContain("Northbridge");
  });
  it("vector leg ranks exact-text match first", async () => {
    const hits = await hybridSearch(
      { query: "Worried about spending too little energy on public building" }, { embed: fakeEmbed });
    expect(hits[0].text).toContain("public building");
  });
  it("date filter excludes everything in the past-only window", async () => {
    const hits = await hybridSearch({ query: "Northbridge", dateTo: "2000-01-01" }, { embed: fakeEmbed });
    expect(hits).toHaveLength(0);
  });
  it("docTypes filter restricts to notes", async () => {
    const hits = await hybridSearch({ query: "Northbridge", docTypes: ["note"] }, { embed: fakeEmbed });
    expect(hits.every((h) => h.source_type === "note")).toBe(true);
  });
});
