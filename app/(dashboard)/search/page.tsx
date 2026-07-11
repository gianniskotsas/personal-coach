import { hybridSearch } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const hits = q ? await hybridSearch({ query: q, topK: 20 }) : [];
  return (
    <main>
      <h1>Search</h1>
      <form method="get">
        <input name="q" defaultValue={q ?? ""} placeholder="Search everything…"
          style={{ width: "70%", padding: 8 }} />
        <button type="submit" style={{ padding: 8, marginLeft: 8 }}>Search</button>
      </form>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {hits.map((h) => (
          <li key={h.id} style={{ margin: "12px 0", padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
            <small>{h.date} · {h.source_type} · {h.chunk_type}{h.workstream ? ` · ${h.workstream}` : ""}</small>
            <p style={{ margin: "4px 0 0" }}>{h.text}</p>
          </li>
        ))}
      </ul>
      {q && hits.length === 0 && <p>No results for “{q}”.</p>}
    </main>
  );
}
