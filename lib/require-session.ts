import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

// Security boundary for dashboard pages. MUST be called (and awaited) at the top
// of every authenticated Server Component page BEFORE any data is fetched.
//
// A redirect() in the (dashboard) layout is NOT sufficient: in the App Router the
// layout and its child page render in parallel, so the page's DB queries still run
// and their results get serialized into the RSC payload. A normal browser GET only
// sees the 307, but an `RSC: 1` request (Next's own prefetch) receives 200 with the
// data. Gating each page here means unauthenticated requests throw before touching
// the DB, so nothing sensitive is ever fetched or serialized.
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}
