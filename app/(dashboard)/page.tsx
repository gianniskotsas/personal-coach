import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type Day = { period_start: string; raw: { headline?: string; workstreams?: Record<string, { activities?: { name: string; description?: string }[] }> } };

export default async function Timeline() {
  const days = await query<Day>(
    `SELECT period_start::text, raw FROM documents WHERE doc_type='daily_entry'
     ORDER BY period_start DESC LIMIT 30`);
  return (
    <main>
      <h1>Timeline</h1>
      {days.map((d) => (
        <details key={d.period_start} style={{ margin: "12px 0", padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
          <summary><strong>{d.period_start}</strong> — {d.raw.headline ?? "(no headline)"}</summary>
          {Object.entries(d.raw.workstreams ?? {}).map(([ws, w]) => (
            <div key={ws} style={{ margin: "8px 0 0 16px" }}>
              <em>{ws}</em>
              <ul>{(w.activities ?? []).map((a, i) => (
                <li key={i}><strong>{a.name}</strong>{a.description ? ` — ${a.description}` : ""}</li>))}
              </ul>
            </div>
          ))}
        </details>
      ))}
    </main>
  );
}
