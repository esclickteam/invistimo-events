import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { assertTenantAccess } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { signMediaUrl } from "@/lib/storage";
import { z } from "zod";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await requireUser();
    const { eventId } = await ctx.params;
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return jsonError("לא נמצא", 404);
    await assertTenantAccess(event.tenantId, user.id);

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const media = await prisma.mediaAsset.findMany({
      where: {
        eventId,
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return jsonOk({
      media: media.map((m) => ({
        ...m,
        sizeBytes: Number(m.sizeBytes),
        url: signMediaUrl(m.previewKey || m.storageKey),
        thumbUrl: m.thumbKey ? signMediaUrl(m.thumbKey) : null,
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

const moderateSchema = z.object({
  mediaIds: z.array(z.string()).min(1),
  action: z.enum(["approve", "reject", "delete"]),
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

    const body = moderateSchema.parse(await req.json());
    if (body.action === "approve") {
      await prisma.mediaAsset.updateMany({
        where: { eventId, id: { in: body.mediaIds } },
        data: { status: "APPROVED" },
      });
      // Also approve for LIVE queue if present
      const live = await prisma.liveSession.findUnique({ where: { eventId } });
      if (live) {
        await prisma.liveQueueItem.updateMany({
          where: { liveSessionId: live.id, mediaId: { in: body.mediaIds } },
          data: { status: "approved" },
        });
      }
    } else if (body.action === "reject") {
      await prisma.mediaAsset.updateMany({
        where: { eventId, id: { in: body.mediaIds } },
        data: { status: "REJECTED" },
      });
    } else {
      const { deleteMediaCascade } = await import("@/lib/media/delete");
      for (const id of body.mediaIds) {
        await deleteMediaCascade(id, user.id);
      }
    }

    await audit({
      action: `media.${body.action}`,
      actorUserId: user.id,
      tenantId: event.tenantId,
      eventId,
      meta: { mediaIds: body.mediaIds },
    });

    return jsonOk({ done: true });
  } catch (e) {
    return handleApiError(e);
  }
}
