import { ParsedDocument } from "./types";
import { parseGoalsLog } from "./parse-goals-log";
import { parseWeekly } from "./parse-weekly";
import { parseMarkdownDoc, quarterStart, earliestDate } from "./parse-markdown";
import { basename } from "node:path";

const MD_TYPES: [RegExp, string][] = [
  [/^quarterly-brief-\d{4}-Q[1-4]\.md$/, "quarterly_brief"],
  [/^self-reflection-\d{4}-Q[1-4]\.md$/, "self_reflection"],
  [/^quarterly-questions-\d{4}-Q[1-4]\.md$/, "quarterly_questions"],
];

export function parseFile(relPath: string, content: string): ParsedDocument[] {
  const name = basename(relPath);
  if (name === "goals-log.json") return parseGoalsLog(content, relPath);
  if (/^week-\d{4}-\d{2}-\d{2}\.json$/.test(name)) return [parseWeekly(content, relPath)];
  if (name === "redflags-log.md")
    return [parseMarkdownDoc(content, relPath, "redflags", earliestDate(content))];
  if (name === "content-log.md")
    return [parseMarkdownDoc(content, relPath, "content_log", earliestDate(content))];
  for (const [re, docType] of MD_TYPES) {
    if (re.test(name)) {
      const q = quarterStart(name);
      if (q) return [parseMarkdownDoc(content, relPath, docType, q)];
    }
  }
  return [];
}
