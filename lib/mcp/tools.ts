import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { hybridSearch } from "../search";
import { getContext } from "../context";
import { runReadOnlySql } from "../run-sql";
import { personHistory } from "../people";
import { getSyncStatus } from "../sync-status";
import { createNote, listNotes } from "../notes";
import type { EmbedFn } from "../embed";

const asText = (v: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(v, null, 2) }] });
const asError = (e: unknown) => ({ content: [{ type: "text" as const, text: String(e instanceof Error ? e.message : e) }], isError: true });

export function registerTools(server: McpServer, opts: { embed?: EmbedFn } = {}) {
  server.registerTool("search",
    { title: "Search coach memory",
      description: "Hybrid (semantic + keyword) search over all coach history and notes.",
      inputSchema: {
        query: z.string(), topK: z.number().int().min(1).max(50).optional(),
        dateFrom: z.string().optional(), dateTo: z.string().optional(),
        docTypes: z.array(z.string()).optional().describe("daily_entry|weekly_report|quarterly_brief|self_reflection|quarterly_questions|redflags|content_log|note"),
        workstream: z.string().optional(),
      } },
    async (args) => {
      try { return asText(await hybridSearch(args, opts)); } catch (e) { return asError(e); }
    });

  server.registerTool("get_context",
    { title: "Get period context",
      description: "Structured slice of coach data: a day, a week (dailies+weekly), or a quarter (weeklies+quarter docs).",
      inputSchema: { type: z.enum(["day", "week", "quarter"]), start: z.string().describe("YYYY-MM-DD period start") } },
    async ({ type, start }) => {
      try { return asText(await getContext({ type, start })); } catch (e) { return asError(e); }
    });

  server.registerTool("run_sql",
    { title: "Run read-only SQL",
      description: "Read-only single SELECT/WITH over the coach tables only (documents, activities, flags, notes, chunks) — auth/account tables are not accessible. 5s timeout, 500-row cap.",
      inputSchema: { sql: z.string() } },
    async ({ sql }) => {
      try { return asText(await runReadOnlySql(sql)); } catch (e) { return asError(e); }
    });

  server.registerTool("person_history",
    { title: "Person history",
      description: "Chronological activities involving a collaborator (partial name match).",
      inputSchema: { name: z.string(), since: z.string().optional() } },
    async ({ name, since }) => {
      try { return asText(await personHistory(name, since)); } catch (e) { return asError(e); }
    });

  server.registerTool("add_note",
    { title: "Add note",
      description: "Store a personal note (thought/idea/concern/career_step). The ONLY write tool. Embedded immediately.",
      inputSchema: {
        text: z.string().min(1), note_type: z.enum(["thought", "idea", "concern", "career_step"]).optional(),
        tags: z.array(z.string()).optional(),
      } },
    async ({ text, note_type, tags }) => {
      try {
        const note = await createNote({ text, noteType: note_type, tags, source: "mcp" }, opts);
        return asText({ id: note.id, created_at: note.created_at });
      } catch (e) { return asError(e); }
    });

  server.registerTool("list_notes",
    { title: "List notes",
      description: "Chronological notes, filterable by since/type/tags.",
      inputSchema: {
        since: z.string().optional(), note_type: z.string().optional(), tags: z.array(z.string()).optional(),
      } },
    async ({ since, note_type, tags }) => {
      try { return asText(await listNotes({ since, noteType: note_type, tags })); } catch (e) { return asError(e); }
    });

  server.registerTool("get_sync_status",
    { title: "Sync status",
      description: "Last ingest time and latest period per doc type — check before trusting answers.",
      inputSchema: {} },
    async () => {
      try { return asText(await getSyncStatus()); } catch (e) { return asError(e); }
    });
}
