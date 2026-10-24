import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";
import { getActiveEntitlement } from "@/lib/quota";

export async function GET() {
  try {
    const user = await requireUser();
    const memberships = await prisma.tenantMember.findMany({
      where: { userId: user.id },
      include: { tenant: true },
    });

    const tenants = await Promise.all(
      memberships.map(async (m) => {
        const ent = await getActiveEntitlement(m.tenantId);
        return {
          id: m.tenant.id,
          name: m.tenant.name,
          slug: m.tenant.slug,
          status: m.tenant.status,
          storageUsedBytes: Number(m.tenant.storageUsedBytes),
          role: m.role,
          plan: ent
            ? {
                code: ent.plan.code,
                nameHe: ent.plan.nameHe,
                maxStorageBytes: Number(ent.plan.maxStorageBytes),
                allowFaceAi: ent.plan.allowFaceAi,
                allowStories: ent.plan.allowStories,
                allowGuestbook: ent.plan.allowGuestbook,
                allowTimeCapsule: ent.plan.allowTimeCapsule,
                allowSummaryFilm: ent.plan.allowSummaryFilm,
              }
            : null,
        };
      })
    );

    return jsonOk({ tenants });
  } catch (e) {
    return handleApiError(e);
  }
}
