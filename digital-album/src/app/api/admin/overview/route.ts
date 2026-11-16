import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireUser(["SUPER_ADMIN"]);
    const [tenants, events, media, jobsFailed, openDeletions, plans, storage] =
      await Promise.all([
        prisma.tenant.count(),
        prisma.event.count(),
        prisma.mediaAsset.count({ where: { deletedAt: null } }),
        prisma.backgroundJob.count({ where: { status: "FAILED" } }),
        prisma.deletionRequest.count({ where: { status: "open" } }),
        prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.tenant.aggregate({ _sum: { storageUsedBytes: true } }),
      ]);

    const recentAudit = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return jsonOk({
      stats: {
        tenants,
        events,
        media,
        jobsFailed,
        openDeletions,
        storageUsedBytes: Number(storage._sum.storageUsedBytes || 0),
      },
      plans: plans.map((p) => ({
        ...p,
        maxStorageBytes: Number(p.maxStorageBytes),
      })),
      recentAudit,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
