import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { getActiveEntitlement } from "@/lib/quota";

const createSchema = z.object({
  tenantId: z.string().min(1),
  type: z.enum([
    "WEDDING",
    "BAR_MITZVAH",
    "BAT_MITZVAH",
    "BRIT",
    "BIRTHDAY",
    "CORPORATE",
    "OTHER",
  ]),
  title: z.string().min(2).max(120),
  hostNames: z.string().min(2).max(120),
  eventDate: z.string().datetime().optional().nullable(),
  personalMessage: z.string().max(2000).optional(),
  slug: z.string().min(3).max(64).optional(),
  uploadMode: z.enum(["GUESTS_ONLY", "OWNERS_ONLY", "EVERYONE"]).optional(),
  mediaAllowed: z.enum(["PHOTOS_ONLY", "VIDEOS_ONLY", "BOTH"]).optional(),
  themeId: z.string().optional(),
  requireApproval: z.boolean().optional(),
  faceAiEnabled: z.boolean().optional(),
  allowDownload: z.boolean().optional(),
  allowZip: z.boolean().optional(),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional(),
});

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenantId");

    const memberships = await prisma.tenantMember.findMany({
      where: { userId: user.id, ...(tenantId ? { tenantId } : {}) },
    });
    if (user.role !== "SUPER_ADMIN" && memberships.length === 0) {
      return jsonOk({ events: [] });
    }

    const tenantIds =
      user.role === "SUPER_ADMIN" && !tenantId
        ? undefined
        : memberships.map((m) => m.tenantId);

    const events = await prisma.event.findMany({
      where: tenantIds ? { tenantId: { in: tenantIds } } : tenantId ? { tenantId } : {},
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { media: true, greetings: true } },
        theme: true,
      },
    });
    return jsonOk({ events });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await req.json());

    const membership = await prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId: body.tenantId, userId: user.id } },
    });
    if (!membership && user.role !== "SUPER_ADMIN") {
      return jsonError("אין הרשאה לחשבון זה", 403);
    }

    const entitlement = await getActiveEntitlement(body.tenantId);
    if (!entitlement) return jsonError("אין חבילה פעילה", 402);

    const eventCount = await prisma.event.count({ where: { tenantId: body.tenantId } });
    if (eventCount >= entitlement.plan.maxEvents) {
      return jsonError("חריגה ממספר האירועים בחבילה", 402);
    }

    let slug = body.slug || slugify(`${body.hostNames}-${Date.now().toString(36)}`);
    slug = slugify(slug);
    if (await prisma.event.findUnique({ where: { slug } })) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const faceAiEnabled =
      body.faceAiEnabled === true && entitlement.plan.allowFaceAi === true
        ? false // still false until global provider is approved & live
        : false;

    const event = await prisma.event.create({
      data: {
        tenantId: body.tenantId,
        type: body.type,
        title: body.title,
        hostNames: body.hostNames,
        eventDate: body.eventDate ? new Date(body.eventDate) : null,
        personalMessage: body.personalMessage,
        slug,
        uploadMode: body.uploadMode || "EVERYONE",
        mediaAllowed: body.mediaAllowed || "BOTH",
        themeId: body.themeId,
        requireApproval: body.requireApproval ?? true,
        faceAiEnabled,
        allowDownload: body.allowDownload ?? true,
        allowZip: body.allowZip ?? false,
        visibility: body.visibility || "UNLISTED",
        status: "published",
        retentionUntil: new Date(
          Date.now() + entitlement.plan.retentionDays * 24 * 60 * 60 * 1000
        ),
        albums: { create: { title: "האלבום שלנו", isPrimary: true } },
        liveSession: { create: {} },
        eventMembers: { create: { userId: user.id, role: "owner" } },
      },
    });

    const defaultChapters =
      body.type === "WEDDING"
        ? ["לפני הכל", "הכנות", "קבלת פנים", "חופה", "המסיבה", "רחבת הריקודים"]
        : ["פתיחה", "רגעים מרכזיים", "אורחים", "סיום"];

    if (entitlement.plan.allowStories) {
      await prisma.storyChapter.createMany({
        data: defaultChapters.map((title, i) => ({
          eventId: event.id,
          title,
          sortOrder: i + 1,
        })),
      });
    }

    await audit({
      action: "event.create",
      actorUserId: user.id,
      tenantId: body.tenantId,
      eventId: event.id,
    });

    return jsonOk({ event });
  } catch (e) {
    return handleApiError(e);
  }
}
