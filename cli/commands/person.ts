import { parseArgs } from "node:util";
import { registerCommand } from "../index";
import { apiGet } from "../client";

async function runPerson(args: string[]) {
  const { values, positionals } = parseArgs({
    args, allowPositionals: true,
    options: { since: { type: "string" }, json: { type: "boolean" } },
  });
  const name = positionals.join(" ");
  if (!name.trim()) throw new Error("usage: personal-coach person <name> [--since=DATE] [--json]");

  const { activities } = await apiGet<{ activities: { date: string; workstream: string; name: string; description: string | null }[] }>(
    "/api/cli/person", { name, ...(values.since ? { since: values.since } : {}) });

  if (values.json) { console.log(JSON.stringify(activities, null, 2)); return; }
  if (!activities.length) { console.log(`No activities found for "${name}".`); return; }
  for (const a of activities) {
    console.log(`[${a.date} · ${a.workstream}] ${a.name}`);
    if (a.description) console.log(`  ${a.description}`);
  }
}

registerCommand("person", runPerson);
