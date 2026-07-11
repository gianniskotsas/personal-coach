import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function Bars({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <section className="mb-10">
      <h2 className="text-xs uppercase tracking-wide text-muted-foreground/70 mb-3">{title}</h2>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[180px_1fr_50px] gap-3 items-center">
            <span className="text-xs truncate">{r.label}</span>
            <div className="h-3.5 rounded bg-muted">
              <div
                className="h-full rounded bg-foreground"
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground text-right">
              {Math.round(r.value * 10) / 10}
            </span>
          </div>
        ))}
      </div>
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
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-lg font-semibold tracking-tight mb-6">Analytics</h1>
      <Bars title="Avg energy % per workstream by month" rows={energy} />
      <Bars title="Hours by activity type" rows={hours} />
      <Bars title="Collaborator frequency" rows={people} />
      <Bars title="Flags per month" rows={flags} />
    </div>
  );
}
