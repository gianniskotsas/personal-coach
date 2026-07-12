import { registerCommand } from "../index";
import { apiGet } from "../client";

async function runStatus(args: string[]) {
  const json = args.includes("--json");
  const { status } = await apiGet<{ status: { doc_type: string; last_ingested_at: string; latest_period: string; docs: number }[] }>(
    "/api/cli/status");
  if (json) { console.log(JSON.stringify(status, null, 2)); return; }
  for (const s of status) {
    console.log(`${s.doc_type.padEnd(16)} ${s.docs.toString().padStart(4)} docs   latest period: ${s.latest_period}   last ingested: ${s.last_ingested_at}`);
  }
}

registerCommand("status", runStatus);
