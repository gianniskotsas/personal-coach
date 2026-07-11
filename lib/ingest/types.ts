import { createHash } from "node:crypto";
export type ParsedActivity = {
  date: string; workstream: string; percentEnergy: number | null;
  name: string; activityType: string | null; description: string | null;
  estimatedHours: number | null; impact: string | null; artifact: string | null;
  collaborators: string[];
};
export type ParsedFlag = { date: string; flag: string; severity: string | null; note: string | null };
export type ParsedDocument = {
  docType: string; periodStart: string; periodEnd: string | null;
  sourcePath: string; contentHash: string;
  raw: unknown | null; bodyMd: string | null;
  activities: ParsedActivity[]; flags: ParsedFlag[];
};
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
