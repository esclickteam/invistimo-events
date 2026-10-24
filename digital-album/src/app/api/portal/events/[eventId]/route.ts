import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";
import { assertTenantAccess } from "@/lib/permissions";

const patchSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  hostNames: z.string().min(2).max(120).optional(),
  eventDate: z.string().datetime().nullable().optional(),
  personalMessage: z.string().max(2000).nullable().optional(),
  uploadMode: z.enum(["GUESTS_ONLY", "OWNERS_ONLY", "EVERYONE"]).optional(),
  mediaAllowed: z.enum(["PHOTOS_ONLY", "VIDEOS_ONLY", "BOTH"]).optional(),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional(),
  allowDownload: z.boolean().optional(),
  allowZip: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
  faceAiEnabled: z.boolean().optional(),
  faceMatchThreshold: z.number().min(70).max(99.9).optional(),
  themeId: z.string().nullable().optional(),
  openAt: z.string().datetime().nullable().optional(),
  closeAt: z.string().datetime().nullable().optional(),
  status: z.enum(["draft", "published", "closed", "archived"]).optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await requireUser();
    const { eventId } = await ctx.params;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        theme: true,
        stories: { orderBy: { sortOrder: "asc" } },
        albums: true,
        liveSession: true,
        _count: {
          select: {
            media: true,
            greetings: true,
            guests: true,
          },
        },
      },
    });
    if (!event) return jsonError("לא נמצא", 404);
    await assertTenantAccess(event.tenantId, user.id);

    const pending = await prisma.mediaAsset.count({
      where: { eventId, status: "PENDING_APPROVAL" },
    });

    return jsonOk({ event, pendingApproval: pending });
  } catch (e) {
    return handleApiError(e);
  }
}

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

    // Face AI can only be toggled on when provider is live AND plan allows
    let faceAiEnabled = body.faceAiEnabled;
    if (faceAiEnabled === true) {
      const { isFaceAiLive } = await import("@/lib/ai/face-provider");
      const { getActiveEntitlement } = await import("@/lib/quota");
      const ent = await getActiveEntitlement(event.tenantId, event.id);
      if (!ent?.plan.allowFaceAi || !isFaceAiLive()) {
        faceAiEnabled = false;
      }
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...body,
        faceAiEnabled: faceAiEnabled ?? undefined,
        eventDate:
          body.eventDate === undefined
            ? undefined
            : body.eventDate
              ? new Date(body.eventDate)
              : null,
        openAt:
          body.openAt === undefined
            ? undefined
            : body.openAt
              ? new Date(body.openAt)
              : null,
        closeAt:
          body.closeAt === undefined
            ? undefined
            : body.closeAt
              ? new Date(body.closeAt)
              : null,
      },
    });

    await audit({
      action: "event.update",
      actorUserId: user.id,
      tenantId: event.tenantId,
      eventId,
      meta: body,
    });

    return jsonOk({ event: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
