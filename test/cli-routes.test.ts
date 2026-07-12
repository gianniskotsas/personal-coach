import { describe, it, expect, beforeAll } from "vitest";
import { query } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createNote } from "@/lib/notes";
import { fakeEmbed } from "./helpers/fake-embed";

let apiKey: string;

beforeAll(async () => {
  await query("TRUNCATE documents, activities, notes RESTART IDENTITY CASCADE");
  process.env.ALLOW_SIGNUP = "true";
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
