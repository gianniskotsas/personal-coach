import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

type NoteRow = { id: number; created_at: string; note_type: string; text: string; tags: string[]; source: string | null };

export function collectFiles(stateDir: string): { path: string; content: string }[] {
  const out: { path: string; content: string }[] = [];
  const skip = new Set(["state.json", "notes-log.json", ".sync-state.json"]);
  for (const name of readdirSync(stateDir)) {
    if (name.startsWith("_") || name.startsWith(".") || skip.has(name)) continue;
    if (/\.(json|md)$/.test(name))
      out.push({ path: name, content: readFileSync(join(stateDir, name), "utf8") });
  }
  const weeksDir = join(stateDir, "weeks");
  if (existsSync(weeksDir))
    for (const name of readdirSync(weeksDir))
      if (/^week-.*\.json$/.test(name))
        out.push({ path: `weeks/${name}`, content: readFileSync(join(weeksDir, name), "utf8") });
  return out;
}

export function appendNotesToMirror(mirrorPath: string, notes: NoteRow[]): number {
  const mirror: { notes: NoteRow[] } = existsSync(mirrorPath)
    ? JSON.parse(readFileSync(mirrorPath, "utf8"))
    : { notes: [] };
  const known = new Set(mirror.notes.map((n) => n.id));
  const fresh = notes.filter((n) => !known.has(n.id));
  mirror.notes.push(...fresh);
  writeFileSync(mirrorPath, JSON.stringify(mirror, null, 2));
  return fresh.length;
}

async function main() {
  const base = process.env.COACH_MEMORY_URL ?? "http://localhost:3000";
  const apiKey = process.env.COACH_SYNC_API_KEY;
  const stateDir = process.env.COACH_STATE_DIR
    ?? join(import.meta.dirname, "..", "..", "career-coach", "state");
  if (!apiKey) { console.error("COACH_SYNC_API_KEY not set"); process.exit(1); }
  const verbose = process.argv.includes("--all");
  try {
    // push
    const files = collectFiles(stateDir);
    const res = await fetch(`${base}/api/ingest`, {
      method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({ files }),
    });
    if (!res.ok) throw new Error(`ingest HTTP ${res.status}`);
    const { results, errors } = await res.json();
    const changed = results.filter((r: { status: string }) => r.status !== "unchanged");
    console.log(`push: ${files.length} files → ${changed.length} changed, ${errors.length} errors`);
    if (verbose || errors.length) console.log(JSON.stringify({ changed, errors }, null, 2));

    // pull
    const statePath = join(stateDir, ".sync-state.json");
    const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
    const since = state.lastNotePull ?? "1970-01-01T00:00:00Z";
    const pull = await fetch(`${base}/api/notes/export?since=${encodeURIComponent(since)}`,
      { headers: { "x-api-key": apiKey } });
    if (!pull.ok) throw new Error(`notes export HTTP ${pull.status}`);
    const { notes } = (await pull.json()) as { notes: NoteRow[] };
    const added = appendNotesToMirror(join(stateDir, "notes-log.json"), notes);
    if (notes.length) state.lastNotePull = notes[notes.length - 1].created_at;
    writeFileSync(statePath, JSON.stringify(state, null, 2));
    console.log(`pull: ${added} new notes mirrored`);
  } catch (e) {
    console.error(`sync failed (will self-heal next run): ${String(e)}`);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("sync.ts")) main();
