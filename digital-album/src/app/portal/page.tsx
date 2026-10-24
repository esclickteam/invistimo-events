import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatDateHe } from "@/lib/utils";
import { getActiveEntitlement } from "@/lib/quota";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const user = await getCurrentUser();
  if (!user) return null;

  const memberships = await prisma.tenantMember.findMany({
    where: { userId: user.id },
    include: { tenant: true },
  });

  const tenantIds = memberships.map((m) => m.tenantId);
  const events = await prisma.event.findMany({
    where: { tenantId: { in: tenantIds } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { media: true } },
    },
  });

  const tenantCards = await Promise.all(
    memberships.map(async (m) => {
      const ent = await getActiveEntitlement(m.tenantId);
      return { tenant: m.tenant, plan: ent?.plan };
    })
  );

  return (
    <div>
      <h1 className="font-display text-4xl md:text-5xl">פורטל הלקוח</h1>
      <p className="mt-2 text-[var(--muted)]">ניהול אירועים, הרשאות, תור אישור וסטטיסטיקות</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {tenantCards.map(({ tenant, plan }) => (
          <div key={tenant.id} className="surface p-5">
            <h2 className="font-display text-2xl">{tenant.name}</h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              חבילה: {plan?.nameHe || "אין"} · אחסון {formatBytes(tenant.storageUsedBytes)}
              {plan ? ` / ${formatBytes(plan.maxStorageBytes)}` : ""}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <h2 className="font-display text-3xl">האירועים שלי</h2>
        <Link href="/portal/events/new" className="btn-gold text-sm">
          אירוע חדש
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {events.length === 0 ? (
          <div className="surface p-8 text-[var(--muted)]">עדיין אין אירועים. צרו את הראשון.</div>
        ) : (
          events.map((ev) => (
            <Link
              key={ev.id}
              href={`/portal/events/${ev.id}`}
              className="surface flex flex-wrap items-center justify-between gap-3 p-5 transition hover:shadow-[var(--shadow)]"
            >
              <div>
                <h3 className="font-display text-2xl">{ev.hostNames}</h3>
                <p className="text-sm text-[var(--muted)]">
                  {ev.title} · {formatDateHe(ev.eventDate)} · {ev._count.media} קבצים
                </p>
              </div>
              <div className="flex gap-2">
                <span className="pill text-xs">{ev.status}</span>
                <span className="pill text-xs">{ev.uploadMode}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
