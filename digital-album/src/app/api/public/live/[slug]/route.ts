import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { signMediaUrl } from "@/lib/storage";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("לא נמצא", 404);

    const live = await prisma.liveSession.findUnique({ where: { eventId: event.id } });
    if (!live || !live.isActive) {
      return jsonOk({
        active: false,
        hostNames: event.hostNames,
        title: event.title,
        items: [],
      });
    }

    const queue = await prisma.liveQueueItem.findMany({
      where: { liveSessionId: live.id, status: { in: ["approved", "shown"] } },
      orderBy: { sortOrder: "asc" },
      take: 50,
    });
    const media = await prisma.mediaAsset.findMany({
      where: {
        id: { in: queue.map((q) => q.mediaId) },
        status: "APPROVED",
        type: "PHOTO",
        deletedAt: null,
      },
    });
    const byId = new Map(media.map((m) => [m.id, m]));

    return jsonOk({
      active: true,
      hostNames: event.hostNames,
      title: event.title,
      autoAdvanceMs: live.autoAdvanceMs,
      displayNames: live.displayNames,
      items: queue
        .map((q) => {
          const m = byId.get(q.mediaId);
          if (!m) return null;
          return {
            id: q.id,
            url: signMediaUrl(m.previewKey || m.storageKey),
            dedication: live.displayNames ? q.dedication : null,
          };
        })
        .filter(Boolean),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
