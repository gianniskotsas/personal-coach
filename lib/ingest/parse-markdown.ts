import { ParsedDocument, sha256 } from "./types";

export function quarterStart(name: string): string | null {
  const m = name.match(/(\d{4})-Q([1-4])/);
  if (!m) return null;
  return `${m[1]}-${String((Number(m[2]) - 1) * 3 + 1).padStart(2, "0")}-01`;
}

export function earliestDate(body: string): string {
  const dates = body.match(/\d{4}-\d{2}-\d{2}/g) ?? [];
  return dates.sort()[0] ?? "1970-01-01";
}

export function parseMarkdownDoc(
  body: string, sourcePath: string, docType: string, periodStart: string
): ParsedDocument {
  return {
    docType, periodStart, periodEnd: null, sourcePath,
    contentHash: sha256(body), raw: null, bodyMd: body, activities: [], flags: [],
  };
}
