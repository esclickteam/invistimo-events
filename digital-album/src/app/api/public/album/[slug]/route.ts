import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { canViewAlbum, loadEventAccess } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth";
import { isFaceAiLive } from "@/lib/ai/face-provider";
import { signMediaUrl } from "@/lib/storage";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        theme: true,
        stories: { orderBy: { sortOrder: "asc" } },
        albums: true,
      },
    });
    if (!event) return jsonError("האלבום לא נמצא", 404);

    const user = await getCurrentUser();
    const access = await loadEventAccess(event.id, user?.id);
    if (
      !canViewAlbum(event, {
        user,
        eventMember: access?.eventMember,
      })
    ) {
      return jsonError("אין גישה לאלבום", 403);
    }

    const url = new URL(req.url);
    const filter = url.searchParams.get("filter") || "all";
    const cursor = url.searchParams.get("cursor");
    const chapterId = url.searchParams.get("chapterId");
    const take = Math.min(Number(url.searchParams.get("limit") || 24), 60);

    const where = {
      eventId: event.id,
      status: "APPROVED" as const,
      deletedAt: null,
      ...(filter === "photos" ? { type: "PHOTO" as const } : {}),
      ...(filter === "videos" ? { type: "VIDEO" as const } : {}),
      ...(chapterId ? { storyChapterId: chapterId } : {}),
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    };

    const [media, photoCount, videoCount, guestCount, pendingCount] =
      await Promise.all([
        prisma.mediaAsset.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: take + 1,
        }),
        prisma.mediaAsset.count({
          where: { eventId: event.id, status: "APPROVED", type: "PHOTO", deletedAt: null },
        }),
        prisma.mediaAsset.count({
          where: { eventId: event.id, status: "APPROVED", type: "VIDEO", deletedAt: null },
        }),
        prisma.guestProfile.count({ where: { eventId: event.id } }),
        access?.eventMember
          ? prisma.mediaAsset.count({
              where: { eventId: event.id, status: "PENDING_APPROVAL" },
            })
          : Promise.resolve(0),
      ]);

    const hasMore = media.length > take;
    const items = hasMore ? media.slice(0, take) : media;
    const nextCursor = hasMore ? items[items.length - 1]?.createdAt.toISOString() : null;

    const faceAiAvailable =
      event.faceAiEnabled && isFaceAiLive();

    return jsonOk({
      event: {
        id: event.id,
        slug: event.slug,
        title: event.title,
        hostNames: event.hostNames,
        eventDate: event.eventDate,
        personalMessage: event.personalMessage,
        uploadMode: event.uploadMode,
        mediaAllowed: event.mediaAllowed,
        allowDownload: event.allowDownload,
        allowZip: event.allowZip,
        requireApproval: event.requireApproval,
        faceAiEnabled: event.faceAiEnabled,
        faceAiAvailable,
        theme: event.theme,
        stories: event.stories,
        status: event.status,
      },
      stats: {
        photos: photoCount,
        videos: videoCount,
        guests: guestCount,
        pendingApproval: pendingCount,
      },
      canUpload: Boolean(
        access &&
          (await import("@/lib/permissions")).canUpload(event, {
            user,
            eventMember: access.eventMember,
            isGuest: !access.eventMember,
          })
      ),
      isOwner: Boolean(access?.eventMember),
      media: items.map((m) => ({
        id: m.id,
        type: m.type,
        width: m.width,
        height: m.height,
        durationMs: m.durationMs,
        storyChapterId: m.storyChapterId,
        url: signMediaUrl(m.previewKey || m.storageKey),
        thumbUrl: signMediaUrl(m.thumbKey || m.posterKey || m.storageKey),
        createdAt: m.createdAt,
      })),
      nextCursor,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
