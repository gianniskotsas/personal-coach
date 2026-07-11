import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function Bars({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <section style={{ margin: "24px 0" }}>
      <h2 style={{ fontSize: 18 }}>{title}</h2>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "grid", gridTemplateColumns: "200px 1fr 60px", gap: 8, alignItems: "center", margin: "4px 0" }}>
          <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
          <div style={{ background: "#e8efe9", borderRadius: 4 }}>
            <div style={{ width: `${(r.value / max) * 100}%`, background: "#2E6E52", height: 14, borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 13, textAlign: "right" }}>{Math.round(r.value * 10) / 10}</span>
        </div>
      ))}
    </section>
  );
}

export default async function Analytics() {
  const energy = await query<{ label: string; value: number }>(
    `SELECT to_char(date_trunc('month', date), 'YYYY-MM') || ' · ' || workstream AS label,
            avg(percent_energy)::float AS value
     FROM (SELECT DISTINCT date, workstream, percent_energy FROM activities) t
     WHERE percent_energy IS NOT NULL
     GROUP BY 1 ORDER BY 1 DESC LIMIT 24`);
  const hours = await query<{ label: string; value: number }>(
    `SELECT coalesce(activity_type, 'untyped') AS label, sum(estimated_hours)::float AS value
     FROM activities WHERE estimated_hours IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 15`);
  const people = await query<{ label: string; value: number }>(
    `SELECT c AS label, count(*)::float AS value
     FROM activities, unnest(collaborators) c GROUP BY 1 ORDER BY 2 DESC LIMIT 15`);
  const flags = await query<{ label: string; value: number }>(
    `SELECT to_char(date_trunc('month', date), 'YYYY-MM') AS label, count(*)::float AS value
     FROM flags GROUP BY 1 ORDER BY 1 DESC LIMIT 12`);
  return (
    <main>
      <h1>Analytics</h1>
      <Bars title="Avg energy % per workstream by month" rows={energy} />
      <Bars title="Hours by activity type" rows={hours} />
      <Bars title="Collaborator frequency" rows={people} />
      <Bars title="Flags per month" rows={flags} />
    </main>
  );
}
