import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { assertTenantAccess } from "@/lib/permissions";
import { getActiveEntitlement } from "@/lib/quota";
import { audit } from "@/lib/audit";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await requireUser();
    const { eventId } = await ctx.params;
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return jsonError("לא נמצא", 404);
    await assertTenantAccess(event.tenantId, user.id);
    const capsules = await prisma.timeCapsule.findMany({
      where: { eventId },
      orderBy: { unlockAt: "asc" },
    });
    return jsonOk({
      capsules: capsules.map((c) => ({
        ...c,
        isLocked: c.isLocked && c.unlockAt > new Date(),
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

const schema = z.object({
  title: z.string().min(2).max(120),
  message: z.string().max(5000).optional(),
  unlockAt: z.string().datetime(),
  mediaIds: z.array(z.string()).default([]),
  greetingIds: z.array(z.string()).default([]),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await requireUser();
    const { eventId } = await ctx.params;
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return jsonError("לא נמצא", 404);
    await assertTenantAccess(event.tenantId, user.id);

    const ent = await getActiveEntitlement(event.tenantId, event.id);
    if (!ent?.plan.allowTimeCapsule) {
      return jsonError("קפסולת זמן אינה כלולה בחבילה", 403);
    }

    const body = schema.parse(await req.json());
    const unlockAt = new Date(body.unlockAt);
    if (unlockAt <= new Date()) return jsonError("תאריך הפתיחה חייב להיות בעתיד", 400);

    const capsule = await prisma.timeCapsule.create({
      data: {
        eventId,
        title: body.title,
        message: body.message,
        unlockAt,
        isLocked: true,
        mediaIdsJson: JSON.stringify(body.mediaIds),
        greetingIdsJson: JSON.stringify(body.greetingIds),
      },
    });

    await audit({
      action: "timecapsule.create",
      actorUserId: user.id,
      tenantId: event.tenantId,
      eventId,
      targetId: capsule.id,
    });

    return jsonOk({ capsule });
  } catch (e) {
    return handleApiError(e);
  }
}
