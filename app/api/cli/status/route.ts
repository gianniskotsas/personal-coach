import { requireApiKey } from "@/lib/api-key";
import { getSyncStatus } from "@/lib/sync-status";

export async function GET(req: Request) {
  const denied = await requireApiKey(req);
  if (denied) return denied;
  const status = await getSyncStatus();
  return Response.json({ status });
}
