import { describe, it, expect, beforeAll } from "vitest";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createNote } from "@/lib/notes";
import { fakeEmbed } from "./helpers/fake-embed";

let apiKey: string;

beforeAll(async () => {
  await query("TRUNCATE documents, activities, notes RESTART IDENTITY CASCADE");
  process.env.ALLOW_SIGNUP = "true";
  process.env.COACH_EMBED_MODE = "fake";
  const email = `cli-route-test-${Date.now()}@test.local`;
  await auth.api.signUpEmail({ body: { email, password: "hunter2hunter2", name: "CLI Test" } });
  const [{ id: userId }] = await query<{ id: string }>(`SELECT id FROM "user" WHERE email = $1`, [email]);
  const created = await auth.api.createApiKey({ body: { name: "cli-route-test", userId } });
  apiKey = created.key;
  const [{ id: documentId }] = await query<{ id: string }>(
    `INSERT INTO documents (doc_type, period_start, source_path, content_hash)
     VALUES ('daily_entry', '2026-06-01', 'state/cli-route-test.json', 'cli-route-test-hash')
     RETURNING id`);
  await query(
    `INSERT INTO activities (document_id, date, workstream, name, activity_type, collaborators)
     VALUES ($1, '2026-06-01', 'product', 'test activity', 'demo', ARRAY['Tom Thorn'])`,
    [documentId]);
});

describe("GET /api/cli/status", () => {
  it("401s without an api key", async () => {
    const { GET } = await import("@/app/api/cli/status/route");
    const res = await GET(new Request("http://test/api/cli/status"));
    expect(res.status).toBe(401);
  });

  it("returns sync status with a valid key", async () => {
    const { GET } = await import("@/app/api/cli/status/route");
    const res = await GET(new Request("http://test/api/cli/status", { headers: { "x-api-key": apiKey } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.status)).toBe(true);
  });
});

describe("GET /api/cli/person", () => {
  it("401s without an api key", async () => {
    const { GET } = await import("@/app/api/cli/person/route");
    const res = await GET(new Request("http://test/api/cli/person?name=Tom"));
    expect(res.status).toBe(401);
  });

  it("400s without a name query param", async () => {
    const { GET } = await import("@/app/api/cli/person/route");
    const res = await GET(new Request("http://test/api/cli/person", { headers: { "x-api-key": apiKey } }));
    expect(res.status).toBe(400);
  });

  it("returns matching activities with a valid key and name", async () => {
    const { GET } = await import("@/app/api/cli/person/route");
    const res = await GET(new Request("http://test/api/cli/person?name=Tom", { headers: { "x-api-key": apiKey } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.activities.length).toBeGreaterThan(0);
  });
});

describe("GET /api/cli/context", () => {
  it("401s without an api key", async () => {
    const { GET } = await import("@/app/api/cli/context/route");
    const res = await GET(new Request("http://test/api/cli/context?type=day&start=2026-06-01"));
    expect(res.status).toBe(401);
  });

  it("400s on an invalid type", async () => {
    const { GET } = await import("@/app/api/cli/context/route");
    const res = await GET(new Request("http://test/api/cli/context?type=month&start=2026-06-01",
      { headers: { "x-api-key": apiKey } }));
    expect(res.status).toBe(400);
  });

  it("400s when start is missing", async () => {
    const { GET } = await import("@/app/api/cli/context/route");
    const res = await GET(new Request("http://test/api/cli/context?type=day",
      { headers: { "x-api-key": apiKey } }));
    expect(res.status).toBe(400);
  });

  it("returns a context slice with a valid key", async () => {
    const { GET } = await import("@/app/api/cli/context/route");
    const res = await GET(new Request("http://test/api/cli/context?type=day&start=2026-06-01",
      { headers: { "x-api-key": apiKey } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("dailies");
    expect(body).toHaveProperty("weeklies");
    expect(body).toHaveProperty("quarterlyDocs");
  });
});

describe("POST /api/cli/search", () => {
  beforeAll(async () => {
    await createNote({ text: "Kicked off the Northbridge integration", noteType: "thought" }, { embed: fakeEmbed });
  });

  it("401s without an api key", async () => {
    const { POST } = await import("@/app/api/cli/search/route");
    const res = await POST(new Request("http://test/api/cli/search", {
      method: "POST", body: JSON.stringify({ query: "Northbridge" }),
    }));
    expect(res.status).toBe(401);
  });

  it("400s on an empty query", async () => {
    const { POST } = await import("@/app/api/cli/search/route");
    const res = await POST(new Request("http://test/api/cli/search", {
      method: "POST", headers: { "x-api-key": apiKey }, body: JSON.stringify({ query: "" }),
    }));
    expect(res.status).toBe(400);
  });

  it("returns hits for a matching query with a valid key", async () => {
    const { POST } = await import("@/app/api/cli/search/route");
    const res = await POST(new Request("http://test/api/cli/search", {
      method: "POST", headers: { "x-api-key": apiKey }, body: JSON.stringify({ query: "Northbridge" }),
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hits.length).toBeGreaterThan(0);
    expect(body.hits[0].text).toContain("Northbridge");
  });
});
