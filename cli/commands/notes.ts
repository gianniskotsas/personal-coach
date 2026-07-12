import { parseArgs } from "node:util";
import { registerCommand } from "../index";
import { apiGet, apiPost } from "../client";

type Note = { id: number; created_at: string; note_type: string; text: string; tags: string[]; source: string | null };

async function runList(args: string[]) {
  const { values } = parseArgs({
    args, options: { type: { type: "string" }, since: { type: "string" }, json: { type: "boolean" } },
  });
  const { notes } = await apiGet<{ notes: Note[] }>("/api/cli/notes", {
    ...(values.type ? { note_type: values.type } : {}),
    ...(values.since ? { since: values.since } : {}),
  });
  if (values.json) { console.log(JSON.stringify(notes, null, 2)); return; }
  if (!notes.length) { console.log("No notes."); return; }
  for (const n of notes) {
    console.log(`[${n.created_at} · ${n.note_type}${n.tags.length ? ` · ${n.tags.join(",")}` : ""}]`);
    console.log(n.text);
    console.log("");
  }
}

async function runAdd(args: string[]) {
  const { values, positionals } = parseArgs({
    args, allowPositionals: true,
    options: { type: { type: "string" }, tags: { type: "string" } },
  });
  const text = positionals.join(" ");
  if (!text.trim()) throw new Error("usage: personal-coach notes add <text> [--type=thought|idea|concern|career_step] [--tags=a,b,c]");
  const note = await apiPost<Note>("/api/cli/notes", {
    text, note_type: values.type, tags: values.tags?.split(",").map((t) => t.trim()).filter(Boolean),
  });
  console.log(`Added note #${note.id}`);
}

async function runNotes(args: string[]) {
  const [sub, ...rest] = args;
  if (sub === "list") return runList(rest);
  if (sub === "add") return runAdd(rest);
  throw new Error("usage: personal-coach notes <list|add> ...");
}

registerCommand("notes", runNotes);
