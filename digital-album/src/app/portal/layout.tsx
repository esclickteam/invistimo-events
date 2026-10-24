import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/ui";
import { LogoutButton } from "@/components/LogoutButton";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b md:border-b-0 md:border-l border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_80%,transparent)] p-5">
        <Link href="/">
          <Logo className="text-xl" />
        </Link>
        <p className="mt-6 text-sm text-[var(--muted)]">שלום, {user.name}</p>
        <nav className="mt-6 flex flex-col gap-2 text-sm">
          <Link className="rounded-xl px-3 py-2 hover:bg-[var(--gold-soft)]" href="/portal">
            סקירה כללית
          </Link>
          <Link
            className="rounded-xl px-3 py-2 hover:bg-[var(--gold-soft)]"
            href="/portal/events/new"
          >
            יצירת אירוע
          </Link>
          {user.role === "SUPER_ADMIN" ? (
            <Link className="rounded-xl px-3 py-2 hover:bg-[var(--gold-soft)]" href="/admin">
              מנהל־על
            </Link>
          ) : null}
          <LogoutButton />
        </nav>
      </aside>
      <div className="p-5 md:p-8">{children}</div>
    </div>
  );
}
