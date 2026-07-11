import { ParsedDocument, sha256 } from "./types";

export function parseWeekly(jsonText: string, sourcePath: string): ParsedDocument {
  const raw = JSON.parse(jsonText) as { week_start: string; week_end?: string };
  return {
    docType: "weekly_report", periodStart: raw.week_start, periodEnd: raw.week_end ?? null,
    sourcePath, contentHash: sha256(jsonText), raw, bodyMd: null, activities: [], flags: [],
  };
}
