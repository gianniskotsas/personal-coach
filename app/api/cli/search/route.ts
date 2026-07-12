import { requireApiKey } from "@/lib/api-key";
import { hybridSearch } from "@/lib/search";

export async function POST(req: Request) {
  const denied = await requireApiKey(req);
  if (denied) return denied;
  const body = (await req.json()) as {
    query?: string; topK?: number; dateFrom?: string; dateTo?: string;
    docTypes?: string[]; workstream?: string;
  };
  if (!body.query || !body.query.trim()) {
    return Response.json({ error: "query is required" }, { status: 400 });
  }
  const hits = await hybridSearch({
    query: body.query,
    topK: body.topK, dateFrom: body.dateFrom, dateTo: body.dateTo,
    docTypes: body.docTypes, workstream: body.workstream,
  });
  return Response.json({ hits });
}
