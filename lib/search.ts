import { query } from "./db";
import { embedTexts, EmbedFn } from "./embed";

export type SearchHit = {
  id: number; text: string; chunk_type: string; source_type: string;
  date: string; workstream: string | null; document_id: number | null; note_id: number | null; score: number;
};

const FILTERS = `
  AND ($2::date IS NULL OR c.date >= $2)
  AND ($3::date IS NULL OR c.date <= $3)
  AND ($4::text[] IS NULL OR c.source_type = ANY($4))
  AND ($5::text IS NULL OR c.workstream = $5)`;

export async function hybridSearch(
  input: { query: string; topK?: number; dateFrom?: string; dateTo?: string; docTypes?: string[]; workstream?: string },
  opts: { embed?: EmbedFn } = {}
): Promise<SearchHit[]> {
  const embed = opts.embed ?? embedTexts;
  const [vector] = await embed([input.query]);
  const params = [
    JSON.stringify(vector),
    input.dateFrom ?? null, input.dateTo ?? null,
    input.docTypes?.length ? input.docTypes : null,
    input.workstream ?? null,
    input.query,
    Math.min(Math.max(1, input.topK ?? 10), 50),
  ];
  return query<SearchHit>(
    `WITH vec AS (
       SELECT c.id, ROW_NUMBER() OVER (ORDER BY c.embedding <=> $1::vector) AS r
       FROM chunks c WHERE c.embedding IS NOT NULL ${FILTERS}
       ORDER BY c.embedding <=> $1::vector LIMIT 50
     ), lex AS (
       SELECT c.id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(c.fts, websearch_to_tsquery('english', $6)) DESC) AS r
       FROM chunks c WHERE c.fts @@ websearch_to_tsquery('english', $6) ${FILTERS}
       ORDER BY r LIMIT 50
     ), fused AS (
       SELECT id, SUM(1.0 / (60 + r)) AS score
       FROM (SELECT * FROM vec UNION ALL SELECT * FROM lex) u GROUP BY id
     )
     SELECT c.id, c.text, c.chunk_type, c.source_type, c.date::text, c.workstream,
            c.document_id, c.note_id, f.score::float
     FROM fused f JOIN chunks c ON c.id = f.id
     ORDER BY f.score DESC, c.date DESC LIMIT $7`,
    params);
}
