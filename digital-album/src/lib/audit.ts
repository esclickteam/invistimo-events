import { prisma } from "./prisma";

export async function audit(params: {
  action: string;
  actorUserId?: string | null;
  tenantId?: string | null;
  eventId?: string | null;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  ip?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      actorUserId: params.actorUserId || null,
      tenantId: params.tenantId || null,
      eventId: params.eventId || null,
      targetType: params.targetType,
      targetId: params.targetId,
      metaJson: JSON.stringify(params.meta || {}),
      ip: params.ip || null,
    },
  });
}
