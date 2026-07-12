import { requireApiKey } from "@/lib/api-key";
import { getContext } from "@/lib/context";

const VALID_TYPES = new Set(["day", "week", "quarter"]);

export async function GET(req: Request) {
  const denied = await requireApiKey(req);
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const start = searchParams.get("start");
  if (!type || !VALID_TYPES.has(type)) {
    return Response.json({ error: "type must be one of: day, week, quarter" }, { status: 400 });
  }
  if (!start) return Response.json({ error: "start query param required" }, { status: 400 });
  const context = await getContext({ type: type as "day" | "week" | "quarter", start });
  return Response.json(context);
}
