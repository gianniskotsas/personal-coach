import { pool, query } from "./db";
import { embedTexts, EmbedFn } from "./embed";

export type Note = { id: number; created_at: string; note_type: string; text: string; tags: string[]; source: string | null };

const VALID_TYPES = new Set(["thought", "idea", "concern", "career_step"]);

export async function createNote(
  input: { text: string; noteType?: string; tags?: string[]; source?: string },
  opts: { embed?: EmbedFn } = {}
): Promise<Note> {
  const embed = opts.embed ?? embedTexts;
  const noteType = input.noteType && VALID_TYPES.has(input.noteType) ? input.noteType : "thought";
  const [vector] = await embed([input.text]);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO notes (note_type, text, tags, source) VALUES ($1,$2,$3,$4)
       RETURNING id, created_at, note_type, text, tags, source`,
      [noteType, input.text, input.tags ?? [], input.source ?? null]);
    const row = ins.rows[0];
    const note = { ...row, created_at: (row.created_at as Date).toISOString() } as Note;
    await client.query(
      `INSERT INTO chunks (note_id, chunk_type, source_type, date, text, embedding, metadata)
       VALUES ($1,'note','note', ($2::timestamptz)::date, $3, $4::vector, $5)`,
      [note.id, note.created_at, input.text, JSON.stringify(vector), { noteType, tags: input.tags ?? [] }]);
    await client.query("COMMIT");
    return note;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function listNotes(
  filter: { since?: string; noteType?: string; tags?: string[] }
): Promise<Note[]> {
  const rows = await query<Note>(
    `SELECT id, created_at, note_type, text, tags, source FROM notes
     WHERE ($1::timestamptz IS NULL OR created_at > $1)
       AND ($2::text IS NULL OR note_type = $2)
       AND ($3::text[] IS NULL OR tags && $3)
     ORDER BY created_at ASC`,
    [filter.since ?? null, filter.noteType ?? null, filter.tags?.length ? filter.tags : null]);
  return rows.map((r) => ({ ...r, created_at: (r.created_at as unknown as Date).toISOString() }));
}
