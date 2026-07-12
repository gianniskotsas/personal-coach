import { parseArgs } from "node:util";
import { registerCommand } from "../index";
import { apiPost } from "../client";

async function runSearch(args: string[]) {
  const { values, positionals } = parseArgs({
    args, allowPositionals: true,
    options: {
      topK: { type: "string" }, from: { type: "string" }, to: { type: "string" },
      type: { type: "string" }, workstream: { type: "string" }, json: { type: "boolean" },
    },
  });
  const query = positionals.join(" ");
  if (!query.trim()) throw new Error("usage: personal-coach search <query> [--topK=10] [--from=DATE] [--to=DATE] [--type=doc_type] [--workstream=ws] [--json]");

  const { hits } = await apiPost<{ hits: { text: string; date: string; source_type: string; chunk_type: string; workstream: string | null; score: number }[] }>(
    "/api/cli/search",
    {
      query,
      topK: values.topK ? Number(values.topK) : undefined,
      dateFrom: values.from, dateTo: values.to,
      docTypes: values.type ? [values.type] : undefined,
      workstream: values.workstream,
    });

  if (values.json) { console.log(JSON.stringify(hits, null, 2)); return; }
  if (!hits.length) { console.log("No results."); return; }
  for (const h of hits) {
    console.log(`[${h.date} · ${h.source_type}${h.workstream ? ` · ${h.workstream}` : ""}] (${h.score.toFixed(3)})`);
    console.log(h.text);
    console.log("");
  }
}

registerCommand("search", runSearch);
