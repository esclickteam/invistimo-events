import { prisma } from "./prisma";

export async function getActiveEntitlement(tenantId: string, eventId?: string) {
  const now = new Date();
  const entitlement = await prisma.entitlement.findFirst({
    where: {
      tenantId,
      status: "active",
      OR: [{ eventId: null }, ...(eventId ? [{ eventId }] : [])],
      AND: [
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  return entitlement;
}

export async function assertCanStoreBytes(tenantId: string, addBytes: number) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("NOT_FOUND");
  if (tenant.status === "suspended") throw new Error("FORBIDDEN");

  const entitlement = await getActiveEntitlement(tenantId);
  const limit = entitlement?.plan.maxStorageBytes ?? BigInt(5 * 1024 ** 3);
  if (tenant.storageUsedBytes + BigInt(addBytes) > limit) {
    throw new Error("QUOTA_EXCEEDED");
  }
}

export async function addStorageUsage(tenantId: string, bytes: number) {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { storageUsedBytes: { increment: BigInt(bytes) } },
  });
}

export async function assertAiSearchQuota(tenantId: string, eventId: string) {
  const entitlement = await getActiveEntitlement(tenantId, eventId);
  if (!entitlement?.plan.allowFaceAi) throw new Error("FORBIDDEN");
  if (entitlement.aiSearchesUsed >= entitlement.plan.maxAiFaceSearches) {
    throw new Error("QUOTA_EXCEEDED");
  }
  return entitlement;
}
