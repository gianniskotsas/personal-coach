import { listNotes } from "@/lib/notes";
import { NotesForm } from "@/components/notes-form";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function Notes() {
  const notes = (await listNotes({})).reverse();
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-lg font-semibold tracking-tight mb-6">Notes</h1>
      <NotesForm />
      <div className="mt-8">
        {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
        {notes.map((n) => (
          <article key={n.id} className="py-4 border-t first:border-t-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {new Date(n.created_at).toISOString().slice(0, 16).replace("T", " ")}
              </span>
              <Badge variant="secondary">{n.note_type}</Badge>
              {n.tags.map((t) => (
                <Badge key={t} variant="outline">{t}</Badge>
              ))}
              <span className="text-xs text-muted-foreground">via {n.source ?? "?"}</span>
            </div>
            <p className="text-sm leading-relaxed">{n.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
