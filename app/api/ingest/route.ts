import { requireApiKey } from "@/lib/api-key";
import { ingestFiles } from "@/lib/ingest/ingest";

export const maxDuration = 300;

export async function POST(req: Request) {
  const denied = await requireApiKey(req);
  if (denied) return denied;
  const body = (await req.json()) as { files?: { path: string; content: string }[] };
  if (!Array.isArray(body.files)) return Response.json({ error: "files[] required" }, { status: 400 });
  const results: unknown[] = [];
  const errors: unknown[] = [];
  for (const file of body.files) {
    try {
      results.push(...(await ingestFiles([file])));
    } catch (e) {
      errors.push({ path: file.path, error: String(e) }); // one bad file doesn't poison the batch
    }
  }
  return Response.json({ results, errors });
}
