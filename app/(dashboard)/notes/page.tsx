import { listNotes } from "@/lib/notes";
import { addNote } from "./actions";

export const dynamic = "force-dynamic";

export default async function Notes() {
  const notes = (await listNotes({})).reverse();
  return (
    <main>
      <h1>Notes</h1>
      <form action={addNote} style={{ display: "grid", gap: 8, maxWidth: 560 }}>
        <textarea name="text" rows={3} placeholder="Thought, idea, concern…" style={{ padding: 8 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <select name="note_type" style={{ padding: 8 }}>
            <option value="thought">thought</option><option value="idea">idea</option>
            <option value="concern">concern</option><option value="career_step">career_step</option>
          </select>
          <input name="tags" placeholder="tags, comma-separated" style={{ padding: 8, flex: 1 }} />
          <button type="submit" style={{ padding: 8 }}>Add note</button>
        </div>
      </form>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {notes.map((n) => (
          <li key={n.id} style={{ margin: "12px 0", padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
            <small>{new Date(n.created_at).toISOString().slice(0, 16).replace("T", " ")} · {n.note_type}
              {n.tags.length ? ` · ${n.tags.join(", ")}` : ""} · via {n.source ?? "?"}</small>
            <p style={{ margin: "4px 0 0" }}>{n.text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
