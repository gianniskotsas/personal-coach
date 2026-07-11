import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { ModeToggle } from "@/components/mode-toggle";

const NAV_LINKS = [
  { href: "/", label: "Timeline" },
  { href: "/notes", label: "Notes" },
  { href: "/analytics", label: "Analytics" },
];

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return (
    <div className="min-h-dvh flex flex-col">
      <nav className="flex items-center gap-6 border-b px-6 py-4">
        <span className="text-sm font-semibold tracking-tight">Personal Coach</span>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {link.label}
          </Link>
        ))}
        <div className="ml-auto">
          <ModeToggle />
        </div>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}
