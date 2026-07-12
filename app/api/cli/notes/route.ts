import { requireApiKey } from "@/lib/api-key";
import { createNote, listNotes } from "@/lib/notes";

export async function GET(req: Request) {
  const denied = await requireApiKey(req);
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const notes = await listNotes({
    since: searchParams.get("since") ?? undefined,
    noteType: searchParams.get("note_type") ?? undefined,
  });
  return Response.json({ notes });
}

export async function POST(req: Request) {
  const denied = await requireApiKey(req);
  if (denied) return denied;
  const body = (await req.json()) as { text?: string; note_type?: string; tags?: string[] };
  if (!body.text || !body.text.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }
  const note = await createNote({
    text: body.text, noteType: body.note_type, tags: body.tags, source: "cli",
  });
  return Response.json(note);
}
