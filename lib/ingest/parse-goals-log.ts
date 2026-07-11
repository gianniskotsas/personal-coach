import { ParsedDocument, ParsedActivity, ParsedFlag, sha256 } from "./types";

type Entry = {
  date?: string; headline?: string;
  workstreams?: Record<string, { percent_energy?: number; activities?: Record<string, unknown>[] }>;
  flags?: ({ flag?: string; severity?: string; note?: string } | string)[];
};

export function parseGoalsLog(jsonText: string, sourcePath: string): ParsedDocument[] {
  const parsed = JSON.parse(jsonText) as { entries: Entry[] };
  // The real goals-log.json interleaves daily entries (which have a `date`) with
  // weekly-summary entries (which carry week_start/week_end and no `date`). Only
  // date-bearing entries are daily documents; weekly summaries are covered by weeks/*.json.
  return parsed.entries
    .filter((entry): entry is Entry & { date: string } => typeof entry.date === "string" && entry.date.length > 0)
    .map((entry) => {
    const activities: ParsedActivity[] = [];
    const seenNames = new Map<string, number>();
    for (const [workstream, ws] of Object.entries(entry.workstreams ?? {})) {
      for (const a of ws.activities ?? []) {
        const baseName = String(a.name ?? "untitled");
        const key = `${workstream}|${baseName}`;
        const seenCount = seenNames.get(key) ?? 0;
        seenNames.set(key, seenCount + 1);
        const name = seenCount === 0 ? baseName : `${baseName} (${seenCount + 1})`;
        activities.push({
          date: entry.date, workstream,
          percentEnergy: ws.percent_energy ?? null,
          name,
          activityType: (a.type as string) ?? null,
          description: (a.description as string) ?? null,
          estimatedHours: a.estimated_hours != null ? Number(a.estimated_hours) : null,
          impact: (a.impact as string) ?? null,
          artifact: (a.artifact as string) ?? null,
          collaborators: Array.isArray(a.collaborators) ? (a.collaborators as string[]) : [],
        });
      }
    }
    const flags: ParsedFlag[] = (entry.flags ?? []).map((f) =>
      typeof f === "string"
        ? { date: entry.date, flag: f, severity: null, note: null }
        : { date: entry.date, flag: f.flag ?? "unknown", severity: f.severity ?? null, note: f.note ?? null });
    return {
      docType: "daily_entry", periodStart: entry.date, periodEnd: null,
      sourcePath, contentHash: sha256(JSON.stringify(entry)),
      raw: entry, bodyMd: null, activities, flags,
    };
  });
}
