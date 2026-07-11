import { PoolClient } from "pg";
import { pool } from "../db";
import { embedTexts, EmbedFn } from "../embed";
import { parseFile } from "./parse-file";
import { buildChunks } from "./chunker";
import { ParsedDocument } from "./types";

export type IngestResult = { docType: string; periodStart: string; status: "inserted" | "updated" | "unchanged" };

export async function ingestFiles(
  files: { path: string; content: string }[],
  opts: { embed?: EmbedFn } = {}
): Promise<IngestResult[]> {
  const embed = opts.embed ?? embedTexts;
  const docs = files.flatMap((f) => parseFile(f.path, f.content));
  const results: IngestResult[] = [];
  const client = await pool.connect();
  try {
    for (const doc of docs) results.push(await ingestOne(client, doc, embed));
  } finally {
    client.release();
  }
  return results;
}

async function ingestOne(client: PoolClient, doc: ParsedDocument, embed: EmbedFn): Promise<IngestResult> {
  const existing = await client.query(
    "SELECT id, content_hash FROM documents WHERE doc_type=$1 AND period_start=$2",
    [doc.docType, doc.periodStart]);
  if (existing.rows[0]?.content_hash === doc.contentHash)
    return { docType: doc.docType, periodStart: doc.periodStart, status: "unchanged" };

  const chunks = buildChunks(doc);
  const vectors = await embed(chunks.map((c) => c.text)); // embed OUTSIDE the transaction

  await client.query("BEGIN");
  try {
    let docId: number;
    if (existing.rows[0]) {
      docId = existing.rows[0].id;
      await client.query(
        "UPDATE documents SET content_hash=$1, raw=$2, body_md=$3, source_path=$4, period_end=$5, ingested_at=now() WHERE id=$6",
        [doc.contentHash, doc.raw, doc.bodyMd, doc.sourcePath, doc.periodEnd, docId]);
      await client.query("DELETE FROM activities WHERE document_id=$1", [docId]);
      await client.query("DELETE FROM chunks WHERE document_id=$1", [docId]);
      await client.query("DELETE FROM flags WHERE document_id=$1", [docId]);
    } else {
      const ins = await client.query(
        `INSERT INTO documents (doc_type, period_start, period_end, source_path, content_hash, raw, body_md)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [doc.docType, doc.periodStart, doc.periodEnd, doc.sourcePath, doc.contentHash, doc.raw, doc.bodyMd]);
      docId = ins.rows[0].id;
    }
    const activityIds = new Map<string, number>();
    for (const a of doc.activities) {
      const ins = await client.query(
        `INSERT INTO activities (document_id, date, workstream, percent_energy, name, activity_type,
           description, estimated_hours, impact, artifact, collaborators)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [docId, a.date, a.workstream, a.percentEnergy, a.name, a.activityType,
         a.description, a.estimatedHours, a.impact, a.artifact, a.collaborators]);
      activityIds.set(`${a.date}|${a.workstream}|${a.name}`, ins.rows[0].id);
    }
    for (const f of doc.flags)
      await client.query(
        "INSERT INTO flags (document_id, date, flag, severity, note) VALUES ($1,$2,$3,$4,$5)",
        [docId, f.date, f.flag, f.severity, f.note]);
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const actId = c.activityKey
        ? activityIds.get(`${c.activityKey.date}|${c.activityKey.workstream}|${c.activityKey.name}`) ?? null
        : null;
      await client.query(
        `INSERT INTO chunks (document_id, activity_id, chunk_type, source_type, workstream, date, text, embedding, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::vector,$9)`,
        [docId, actId, c.chunkType, doc.docType, c.workstream, c.date, c.text,
         JSON.stringify(vectors[i]), c.metadata]);
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
  return { docType: doc.docType, periodStart: doc.periodStart,
           status: existing.rows[0] ? "updated" : "inserted" };
}
