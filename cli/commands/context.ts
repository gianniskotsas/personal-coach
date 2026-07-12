import { registerCommand } from "../index";
import { apiGet } from "../client";

async function runContext(args: string[]) {
  const [type, start] = args;
  if (!type || !["day", "week", "quarter"].includes(type) || !start) {
    throw new Error("usage: personal-coach context <day|week|quarter> <YYYY-MM-DD> [--json]");
  }
  const json = args.includes("--json");
  const context = await apiGet<{ dailies: unknown[]; weeklies: unknown[]; quarterlyDocs: unknown[] }>(
    "/api/cli/context", { type, start });
  if (json) { console.log(JSON.stringify(context, null, 2)); return; }
  console.log(`Dailies: ${context.dailies.length}`);
  console.log(`Weeklies: ${context.weeklies.length}`);
  console.log(`Quarterly docs: ${context.quarterlyDocs.length}`);
  console.log(JSON.stringify(context, null, 2));
}

registerCommand("context", runContext);
