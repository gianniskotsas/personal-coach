import { query } from "./db";

type Period = { type: "day" | "week" | "quarter"; start: string };
type DocRow = { raw: unknown };
type QuarterlyDoc = { doc_type: string; body_md: string };

export async function getContext(period: Period): Promise<{
  dailies: unknown[]; weeklies: unknown[]; quarterlyDocs: QuarterlyDoc[];
}> {
  const { type, start } = period;

  // Inlined per-type SQL (not string-interpolated date math) so every query is fully
  // parameterized and each range's semantics are easy to verify independently.
  let dailies: DocRow[];
  let weeklies: DocRow[];
  let quarterlyDocs: QuarterlyDoc[] = [];

  if (type === "day") {
    dailies = await query<DocRow>(
      `SELECT raw FROM documents WHERE doc_type='daily_entry' AND period_start = $1::date ORDER BY period_start`,
      [start]);
    weeklies = await query<DocRow>(
      `SELECT raw FROM documents WHERE doc_type='weekly_report' AND period_start = $1::date ORDER BY period_start`,
      [start]);
  } else if (type === "week") {
    dailies = await query<DocRow>(
      `SELECT raw FROM documents WHERE doc_type='daily_entry'
       AND period_start BETWEEN $1::date AND $1::date + 6 ORDER BY period_start`,
      [start]);
    weeklies = await query<DocRow>(
      `SELECT raw FROM documents WHERE doc_type='weekly_report'
       AND period_start BETWEEN $1::date AND $1::date + 6 ORDER BY period_start`,
      [start]);
  } else {
    dailies = await query<DocRow>(
      `SELECT raw FROM documents WHERE doc_type='daily_entry'
       AND period_start BETWEEN $1::date AND ($1::date + interval '3 months' - interval '1 day')
       ORDER BY period_start`,
      [start]);
    weeklies = await query<DocRow>(
      `SELECT raw FROM documents WHERE doc_type='weekly_report'
       AND period_start BETWEEN $1::date AND ($1::date + interval '3 months' - interval '1 day')
       ORDER BY period_start`,
      [start]);
    quarterlyDocs = await query<QuarterlyDoc>(
      `SELECT doc_type, body_md FROM documents
       WHERE doc_type IN ('quarterly_brief','self_reflection','quarterly_questions') AND period_start = $1::date`,
      [start]);
  }

  return {
    dailies: dailies.map((d) => d.raw),
    weeklies: weeklies.map((d) => d.raw),
    quarterlyDocs,
  };
}
