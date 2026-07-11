import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <nav style={{ display: "flex", gap: 16, borderBottom: "1px solid #ddd", paddingBottom: 12, marginBottom: 24 }}>
        <strong>Coach Memory</strong>
        <Link href="/">Timeline</Link>
        <Link href="/search">Search</Link>
        <Link href="/notes">Notes</Link>
        <Link href="/analytics">Analytics</Link>
      </nav>
      {children}
    </div>
  );
}
