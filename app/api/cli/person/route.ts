import { requireApiKey } from "@/lib/api-key";
import { personHistory } from "@/lib/people";

export async function GET(req: Request) {
  const denied = await requireApiKey(req);
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  if (!name) return Response.json({ error: "name query param required" }, { status: 400 });
  const since = searchParams.get("since") ?? undefined;
  const activities = await personHistory(name, since);
  return Response.json({ activities });
}
