/**
 * End-to-end MCP + OAuth smoke: proves a real client can register, obtain a
 * token through the PKCE authorization-code flow, and call the MCP tools over
 * the wire with that Bearer token. The interactive consent CLICK is the only
 * browser step; we pre-record it in oauthConsent (what the click does) so the
 * rest of the machine — DCR, PKCE, token exchange, Bearer-gated MCP calls —
 * runs for real. Run against the dev server: `npx tsx --env-file=.env.local scripts/mcp-e2e.ts`
 */
import { createHash, randomBytes } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { query } from "../lib/db";

const BASE = process.env.COACH_MEMORY_URL ?? "http://localhost:3000";
const EMAIL = process.argv[2] ?? "coach@example.com";
const PASSWORD = process.argv[3] ?? "coachdev12345";
const REDIRECT = "http://localhost:9999/callback";
const SCOPE = "openid profile email offline_access";
const b64url = (b: Buffer) => b.toString("base64url");
const ok = (m: string) => console.log(`  ✓ ${m}`);

async function main() {
  // 1. Sign in → session cookie (Origin header satisfies better-auth CSRF check)
  const signIn = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST", headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!signIn.ok) throw new Error(`sign-in failed HTTP ${signIn.status}: ${await signIn.text()}`);
  const cookie = (signIn.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("no session cookie returned from sign-in");
  ok(`signed in as ${EMAIL}`);

  // 2. Dynamic client registration
  const reg = await fetch(`${BASE}/api/auth/mcp/register`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "mcp-e2e-test", redirect_uris: [REDIRECT],
      grant_types: ["authorization_code"], response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });
  if (!reg.ok) throw new Error(`DCR failed HTTP ${reg.status}: ${await reg.text()}`);
  const clientId = (await reg.json()).client_id as string;
  ok(`registered client_id ${clientId.slice(0, 10)}…`);

  // 3. Pre-record consent (== the one-time browser "Allow" click)
  const [{ id: userId }] = await query<{ id: string }>(`SELECT id FROM "user" WHERE email=$1`, [EMAIL]);
  await query(
    `INSERT INTO "oauthConsent" (id, "clientId", "userId", scopes, "consentGiven", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,true, now(), now())`,
    [randomBytes(16).toString("hex"), clientId, userId, SCOPE]);
  ok("recorded consent");

  // 4. PKCE + authorize → code
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const state = b64url(randomBytes(8));
  const authUrl = `${BASE}/api/auth/mcp/authorize?` + new URLSearchParams({
    response_type: "code", client_id: clientId, redirect_uri: REDIRECT,
    code_challenge: challenge, code_challenge_method: "S256", scope: SCOPE, state,
  });
  const authRes = await fetch(authUrl, { headers: { cookie }, redirect: "manual" });
  const location = authRes.headers.get("location");
  if (!location) throw new Error(`authorize returned no redirect (HTTP ${authRes.status}: ${(await authRes.text()).slice(0, 200)})`);
  const code = new URL(location, BASE).searchParams.get("code");
  if (!code) throw new Error(`authorize redirect had no code: ${location}`);
  ok("authorization code issued (PKCE)");

  // 5. Token exchange
  const tokRes = await fetch(`${BASE}/api/auth/mcp/token`, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", code, redirect_uri: REDIRECT,
      client_id: clientId, code_verifier: verifier,
    }),
  });
  if (!tokRes.ok) throw new Error(`token exchange failed HTTP ${tokRes.status}: ${await tokRes.text()}`);
  const accessToken = (await tokRes.json()).access_token as string;
  if (!accessToken) throw new Error("no access_token in token response");
  ok(`access token obtained (${accessToken.length} chars)`);

  // 6. Real MCP client over the wire with the Bearer token
  const transport = new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const client = new Client({ name: "mcp-e2e", version: "1.0.0" });
  await client.connect(transport);
  ok("MCP initialize handshake succeeded");

  const tools = (await client.listTools()).tools.map((t) => t.name).sort();
  const expected = ["add_note", "get_context", "get_sync_status", "list_notes", "person_history", "run_sql", "search"];
  const match = JSON.stringify(tools) === JSON.stringify(expected);
  console.log(`  tools/list -> [${tools.join(", ")}]`);
  if (!match) throw new Error(`tool set mismatch. expected ${expected.join(",")}`);
  ok("all 7 tools present");

  const status = await client.callTool({ name: "get_sync_status", arguments: {} });
  const statusText = (status.content as { type: string; text: string }[])[0].text;
  ok(`get_sync_status returned ${statusText.length} chars of live data`);

  const searchRes = await client.callTool({ name: "search", arguments: { query: "cash management page redesign", topK: 3 } });
  const searchText = (searchRes.content as { type: string; text: string }[])[0].text;
  const hits = JSON.parse(searchText);
  ok(`search returned ${Array.isArray(hits) ? hits.length : "?"} hits over the wire`);

  const guard = await client.callTool({ name: "run_sql", arguments: { sql: "DELETE FROM notes" } });
  const guardText = (guard.content as { type: string; text: string }[])[0].text;
  if (!/read-only violation/.test(guardText)) throw new Error(`run_sql guard not enforced over MCP: ${guardText}`);
  ok("run_sql write rejected over MCP (guard holds end-to-end)");

  // run_sql analytics (a real read that returns rows)
  const sql = await client.callTool({ name: "run_sql", arguments: { sql: "SELECT activity_type, count(*) n FROM activities GROUP BY 1 ORDER BY 2 DESC LIMIT 3" } });
  const sqlRows = JSON.parse((sql.content as { type: string; text: string }[])[0].text).rows;
  if (!Array.isArray(sqlRows) || !sqlRows.length) throw new Error("run_sql analytics returned no rows");
  ok(`run_sql analytics returned ${sqlRows.length} rows (top type: ${sqlRows[0].activity_type})`);

  // person_history over the wire
  const person = await client.callTool({ name: "person_history", arguments: { name: "Tom" } });
  const personRows = JSON.parse((person.content as { type: string; text: string }[])[0].text);
  if (!Array.isArray(personRows) || !personRows.length) throw new Error("person_history returned no rows for a known collaborator");
  ok(`person_history('Tom') returned ${personRows.length} chronological activities`);

  // get_context over the wire (a real week that has data)
  const ctx = await client.callTool({ name: "get_context", arguments: { type: "week", start: "2026-06-15" } });
  const ctxObj = JSON.parse((ctx.content as { type: string; text: string }[])[0].text);
  if (!ctxObj.dailies?.length && !ctxObj.weeklies?.length) throw new Error("get_context returned an empty week");
  ok(`get_context(week 2026-06-15) -> ${ctxObj.dailies?.length ?? 0} dailies, ${ctxObj.weeklies?.length ?? 0} weekly`);

  // add_note (the ONLY write tool, the phone-capture path) -> list_notes -> searchable
  const marker = `e2e-marker-${randomBytes(4).toString("hex")}`;
  const added = await client.callTool({ name: "add_note", arguments: { text: `${marker}: worried I default to the keyboard instead of delegating`, note_type: "concern", tags: ["e2e"] } });
  const noteId = JSON.parse((added.content as { type: string; text: string }[])[0].text).id;
  if (!noteId) throw new Error("add_note returned no id");
  ok(`add_note wrote note #${noteId} over MCP`);

  const listed = await client.callTool({ name: "list_notes", arguments: { note_type: "concern" } });
  if (!(listed.content as { type: string; text: string }[])[0].text.includes(marker)) throw new Error("list_notes did not return the just-added note");
  ok("list_notes returned the new note");

  const noteSearch = await client.callTool({ name: "search", arguments: { query: marker, topK: 5 } });
  if (!(noteSearch.content as { type: string; text: string }[])[0].text.includes(marker)) throw new Error("added note was not searchable (embedding/index issue)");
  ok("added note is immediately searchable (embedded on write)");

  // cleanup: remove the test note so the smoke stays repeatable and data clean
  await query("DELETE FROM notes WHERE id = $1", [noteId]);
  ok("cleaned up the test note");

  await client.close();
  console.log("\nMCP + OAuth end-to-end (all 7 tools): PASS");
  process.exit(0);
}

main().catch((e) => { console.error("\nFAILED:", e.message); process.exit(1); });
