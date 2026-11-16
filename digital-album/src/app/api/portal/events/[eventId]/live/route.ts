import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { assertTenantAccess } from "@/lib/permissions";
import { signMediaUrl } from "@/lib/storage";
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

    let live = await prisma.liveSession.findUnique({
      where: { eventId },
      include: { queue: { orderBy: { createdAt: "desc" }, take: 100 } },
    });
    if (!live) {
      live = await prisma.liveSession.create({
        data: { eventId },
        include: { queue: true },
      });
    }

    const mediaIds = live.queue.map((q) => q.mediaId);
    const media = await prisma.mediaAsset.findMany({
      where: { id: { in: mediaIds } },
    });
    const byId = new Map(media.map((m) => [m.id, m]));

    return jsonOk({
      live: {
        ...live,
        queue: live.queue.map((q) => {
          const m = byId.get(q.mediaId);
          return {
            ...q,
            thumbUrl: m?.thumbKey ? signMediaUrl(m.thumbKey) : null,
            url: m ? signMediaUrl(m.previewKey || m.storageKey) : null,
            type: m?.type,
          };
        }),
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  displayNames: z.boolean().optional(),
  autoAdvanceMs: z.number().int().min(2000).max(60000).optional(),
  stop: z.boolean().optional(),
  approveIds: z.array(z.string()).optional(),
  rejectIds: z.array(z.string()).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await requireUser();
    const { eventId } = await ctx.params;
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return jsonError("לא נמצא", 404);
    await assertTenantAccess(event.tenantId, user.id);

    const body = patchSchema.parse(await req.json());
    const live = await prisma.liveSession.upsert({
      where: { eventId },
      create: { eventId },
      update: {},
    });

    if (body.stop) {
      await prisma.liveSession.update({
        where: { id: live.id },
        data: { isActive: false, stoppedAt: new Date() },
      });
    } else {
      await prisma.liveSession.update({
        where: { id: live.id },
        data: {
          isActive: body.isActive,
          displayNames: body.displayNames,
          autoAdvanceMs: body.autoAdvanceMs,
        },
      });
    }

    if (body.approveIds?.length) {
      await prisma.liveQueueItem.updateMany({
        where: { liveSessionId: live.id, id: { in: body.approveIds } },
        data: { status: "approved" },
      });
      const items = await prisma.liveQueueItem.findMany({
        where: { id: { in: body.approveIds } },
      });
      await prisma.mediaAsset.updateMany({
        where: { id: { in: items.map((i) => i.mediaId) } },
        data: { status: "APPROVED" },
      });
    }
    if (body.rejectIds?.length) {
      await prisma.liveQueueItem.updateMany({
        where: { liveSessionId: live.id, id: { in: body.rejectIds } },
        data: { status: "rejected" },
      });
    }

    await audit({
      action: "live.update",
      actorUserId: user.id,
      tenantId: event.tenantId,
      eventId,
      meta: body,
    });

    return jsonOk({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
