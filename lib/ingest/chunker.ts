import { ParsedDocument } from "./types";

export type ChunkInput = {
  chunkType: "activity" | "headline" | "weekly_section" | "md_chunk";
  date: string; text: string; workstream: string | null;
  activityKey?: { date: string; workstream: string; name: string };
  metadata: Record<string, unknown>;
};

const WEEKLY_SKIP = new Set(["tier", "week_start", "week_end", "daily_entries"]);

export function buildChunks(doc: ParsedDocument): ChunkInput[] {
  if (doc.docType === "daily_entry") {
    const entry = doc.raw as { headline?: string };
    const chunks: ChunkInput[] = [];
    if (entry.headline)
      chunks.push({ chunkType: "headline", date: doc.periodStart, workstream: null,
        text: `[${doc.periodStart}] ${entry.headline}`, metadata: {} });
    for (const a of doc.activities) {
      const parts = [`[${a.date} · ${a.workstream}] ${a.name}`];
      if (a.description) parts.push(a.description);
      if (a.impact) parts.push(`impact: ${a.impact}`);
      if (a.collaborators.length) parts.push(`with: ${a.collaborators.join(", ")}`);
      chunks.push({
        chunkType: "activity", date: a.date, workstream: a.workstream,
        text: parts.join(" — "),
        activityKey: { date: a.date, workstream: a.workstream, name: a.name },
        metadata: { activityType: a.activityType },
      });
    }
    return chunks;
  }
  if (doc.docType === "weekly_report") {
    const raw = doc.raw as Record<string, unknown>;
    const src = raw.weekly_summary && typeof raw.weekly_summary === "object"
      ? (raw.weekly_summary as Record<string, unknown>) : raw;
    const out: ChunkInput[] = [];
    for (const [k, v] of Object.entries(src)) {
      if (WEEKLY_SKIP.has(k) || v == null || typeof v === "number") continue;
      const value = typeof v === "string" ? v : JSON.stringify(v);
      if (!value.trim()) continue;
      const full = `[week ${doc.periodStart}] ${k}: ${value}`;
      for (let i = 0; i < full.length; i += 2400)
        out.push({
          chunkType: "weekly_section", date: doc.periodStart, workstream: null,
          text: full.slice(i, i + 2400), metadata: { section: k },
        });
    }
    return out;
  }
  // markdown docs
  const body = doc.bodyMd ?? "";
  const sections = body.split(/^(?=#{1,3} )/m).filter((s) => s.trim().length > 0);
  const out: ChunkInput[] = [];
  for (const section of sections) {
    if (section.length <= 2400) { out.push(mdChunk(doc, section)); continue; }
    let buf = "";
    for (const para of section.split(/\n\n+/)) {
      if (buf && buf.length + para.length + 2 > 2400) { out.push(mdChunk(doc, buf)); buf = ""; }
      buf = buf ? `${buf}\n\n${para}` : para;
      while (buf.length > 2400) { out.push(mdChunk(doc, buf.slice(0, 2400))); buf = buf.slice(2400); }
    }
    if (buf.trim()) out.push(mdChunk(doc, buf));
  }
  return out;
}

const mdChunk = (doc: ParsedDocument, text: string): ChunkInput => ({
  chunkType: "md_chunk", date: doc.periodStart, workstream: null,
  text: text.trim(), metadata: { docType: doc.docType },
});
