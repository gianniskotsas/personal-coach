import { query } from "./db";

export async function getSyncStatus() {
  return query<{ doc_type: string; last_ingested_at: string; latest_period: string; docs: number }>(
    `SELECT doc_type, max(ingested_at)::text AS last_ingested_at,
            max(period_start)::text AS latest_period, count(*)::int AS docs
     FROM documents GROUP BY doc_type
     UNION ALL
     SELECT 'note', max(created_at)::text, max(created_at)::date::text, count(*)::int FROM notes HAVING count(*) > 0
     ORDER BY doc_type`);
}
