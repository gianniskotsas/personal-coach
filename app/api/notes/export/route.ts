import { requireApiKey } from "@/lib/api-key";
import { listNotes } from "@/lib/notes";

export async function GET(req: Request) {
  const denied = await requireApiKey(req);
  if (denied) return denied;
  const since = new URL(req.url).searchParams.get("since") || undefined;
  return Response.json({ notes: await listNotes({ since }) });
}
