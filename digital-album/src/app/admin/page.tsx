import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBytes } from "@/lib/utils";
import { Logo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "SUPER_ADMIN") redirect("/portal");

  const [tenants, events, media, jobsFailed, plans, storage, audit] =
    await Promise.all([
      prisma.tenant.count(),
      prisma.event.count(),
      prisma.mediaAsset.count({ where: { deletedAt: null } }),
      prisma.backgroundJob.count({ where: { status: "FAILED" } }),
      prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.tenant.aggregate({ _sum: { storageUsedBytes: true } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    ]);

  const tenantList = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Logo />
          <h1 className="font-display text-4xl mt-4">מערכת מנהל־על</h1>
        </div>
        <Link href="/portal" className="btn-ghost text-sm">
          לפורטל
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["לקוחות", tenants],
          ["אירועים", events],
          ["מדיה", media],
          ["עבודות כושלות", jobsFailed],
        ].map(([label, value]) => (
          <div key={String(label)} className="surface p-5">
            <p className="text-sm text-[var(--muted)]">{label}</p>
            <p className="font-display text-4xl mt-1">{value as number}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-[var(--muted)]">
        אחסון כולל בשימוש: {formatBytes(storage._sum.storageUsedBytes || 0)}
      </p>

      <section className="mt-10">
        <h2 className="font-display text-3xl mb-4">חבילות (ניתנות לעריכה)</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="surface p-5">
              <h3 className="font-display text-2xl">{p.nameHe}</h3>
              <p className="text-sm text-[var(--muted)] mt-2">{p.descriptionHe}</p>
              <ul className="mt-3 text-sm space-y-1 text-[var(--muted)]">
                <li>אחסון: {formatBytes(p.maxStorageBytes)}</li>
                <li>AI searches: {p.maxAiFaceSearches}</li>
                <li>שמירה: {p.retentionDays} ימים</li>
                <li>
                  מחיר אירוע: ₪{(p.priceOnceAgorot / 100).toLocaleString("he-IL")}
                </li>
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-3xl mb-4">לקוחות</h2>
        <div className="space-y-2">
          {tenantList.map((t) => (
            <div key={t.id} className="surface flex justify-between gap-3 p-4 text-sm">
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-[var(--muted)]">
                  {t.slug} · {formatBytes(t.storageUsedBytes)}
                </div>
              </div>
              <span className="pill">{t.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 mb-16">
        <h2 className="font-display text-3xl mb-4">יומן פעולות</h2>
        <div className="space-y-2">
          {audit.map((a) => (
            <div key={a.id} className="surface p-3 text-sm flex justify-between gap-3">
              <span>{a.action}</span>
              <span className="text-[var(--muted)]">
                {a.createdAt.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
