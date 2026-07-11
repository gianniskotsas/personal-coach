import { auth } from "./auth";

export async function requireApiKey(req: Request): Promise<Response | null> {
  const key = req.headers.get("x-api-key");
  if (!key) return Response.json({ error: "missing x-api-key" }, { status: 401 });
  const result = await auth.api.verifyApiKey({ body: { key } });
  if (!result.valid) return Response.json({ error: "invalid api key" }, { status: 401 });
  return null;
}
