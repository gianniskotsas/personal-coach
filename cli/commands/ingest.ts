import { readFileSync } from "node:fs";
import { join, relative, isAbsolute } from "node:path";
import { registerCommand } from "../index";
import { runSync, defaultStateDir } from "../../sync/sync";

function singleFileEntry(fileArg: string): { path: string; content: string } {
  const dir = defaultStateDir();
  const absPath = isAbsolute(fileArg) ? fileArg : join(process.cwd(), fileArg);
  const relPath = relative(dir, absPath);
  if (relPath.startsWith("..")) {
    throw new Error(`${fileArg} is not inside ${dir} — ingest expects a file under career-coach/state/`);
  }
  return { path: relPath, content: readFileSync(absPath, "utf8") };
}

async function runIngest(args: string[]) {
  const files = args[0] ? [singleFileEntry(args[0])] : undefined;
  await runSync({ files, verbose: true });
}

registerCommand("ingest", runIngest);
