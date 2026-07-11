import { describe, it, expect, beforeAll } from "vitest";
import { query } from "@/lib/db";
import { registerTools } from "@/lib/mcp/tools";
import { fakeEmbed } from "./helpers/fake-embed";

type Handler = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[] }>;
const tools = new Map<string, Handler>();
const fakeServer = {
  registerTool: (name: string, _cfg: unknown, handler: Handler) => tools.set(name, handler),
} as never;

beforeAll(async () => {
  await query("TRUNCATE notes RESTART IDENTITY CASCADE");
  registerTools(fakeServer, { embed: fakeEmbed });
});

describe("mcp tools", () => {
  it("registers exactly the 7 spec tools", () => {
    expect([...tools.keys()].sort()).toEqual([
      "add_note", "get_context", "get_sync_status", "list_notes", "person_history", "run_sql", "search",
    ]);
  });
  it("add_note → list_notes round trip", async () => {
    const added = await tools.get("add_note")!({ text: "Idea: demo coach memory at all-hands", note_type: "idea", tags: ["demo"] });
    expect(added.content[0].text).toContain("id");
    const listed = await tools.get("list_notes")!({});
    expect(listed.content[0].text).toContain("all-hands");
  });
  it("run_sql refuses writes and reports the error as text", async () => {
    const res = await tools.get("run_sql")!({ sql: "DELETE FROM notes" });
    expect(res.content[0].text).toMatch(/read-only violation/);
  });
  it("search returns hits as JSON text", async () => {
    const res = await tools.get("search")!({ query: "Idea: demo coach memory at all-hands" });
    expect(res.content[0].text).toContain("all-hands");
  });
});
