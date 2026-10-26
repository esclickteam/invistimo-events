import type {
  Event,
  EventMember,
  MediaKindAllowed,
  UploadMode,
  User,
} from "@prisma/client";
import { prisma } from "./prisma";

export type AccessContext = {
  user?: Pick<User, "id" | "role"> | null;
  isGuest?: boolean;
  eventMember?: EventMember | null;
};

export async function loadEventAccess(eventId: string, userId?: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return null;
  let eventMember: EventMember | null = null;
  if (userId) {
    eventMember = await prisma.eventMember.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (!eventMember) {
      const membership = await prisma.tenantMember.findUnique({
        where: { tenantId_userId: { tenantId: event.tenantId, userId } },
      });
      if (membership) {
        eventMember = {
          id: "tenant",
          eventId,
          userId,
          role: membership.role === "TENANT_OWNER" ? "owner" : "editor",
          createdAt: new Date(),
        };
      }
    }
  }
  return { event, eventMember };
}

export function canViewAlbum(event: Event, ctx: AccessContext) {
  if (event.status === "draft" && !ctx.eventMember && ctx.user?.role !== "SUPER_ADMIN") {
    return false;
  }
  if (event.visibility === "PRIVATE") {
    return Boolean(ctx.eventMember || ctx.user?.role === "SUPER_ADMIN");
  }
  if (event.openAt && event.openAt > new Date()) {
    return Boolean(ctx.eventMember || ctx.user?.role === "SUPER_ADMIN");
  }
  if (event.closeAt && event.closeAt < new Date()) {
    // closed for uploads may still allow view depending on status
    if (event.status === "archived" && !ctx.eventMember) return false;
  }
  return true;
}

export function canUpload(event: Event, ctx: AccessContext) {
  if (event.status === "closed" || event.status === "archived") return false;
  if (event.openAt && event.openAt > new Date() && !ctx.eventMember) return false;
  if (event.closeAt && event.closeAt < new Date() && !ctx.eventMember) return false;

  const isOwnerSide = Boolean(
    ctx.eventMember &&
      ["owner", "co_host", "photographer", "editor"].includes(ctx.eventMember.role)
  );

  switch (event.uploadMode) {
    case "GUESTS_ONLY":
      // Guests only — authenticated owners/photographers are blocked on purpose
      return !isOwnerSide;
    case "OWNERS_ONLY":
      return isOwnerSide;
    case "EVERYONE":
      return true;
    default:
      return false;
  }
}

export function canDownload(event: Event, ctx: AccessContext) {
  if (!event.allowDownload) {
    return Boolean(ctx.eventMember || ctx.user?.role === "SUPER_ADMIN");
  }
  return canViewAlbum(event, ctx);
}

export function canZip(event: Event, ctx: AccessContext) {
  if (!event.allowZip) return Boolean(ctx.eventMember);
  return canDownload(event, ctx);
}

export function mediaTypeAllowed(event: Event, mime: string) {
  const isVideo = mime.startsWith("video/");
  const isImage = mime.startsWith("image/");
  const allowed: MediaKindAllowed = event.mediaAllowed;
  if (allowed === "PHOTOS_ONLY") return isImage;
  if (allowed === "VIDEOS_ONLY") return isVideo;
  return isImage || isVideo;
}

export function isOwnerLike(mode: UploadMode, role?: string | null) {
  if (!role) return false;
  if (mode === "GUESTS_ONLY") return false;
  return ["owner", "co_host", "photographer", "editor"].includes(role);
}

export async function assertTenantAccess(tenantId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.role === "SUPER_ADMIN") return { role: "SUPER_ADMIN" as const };
  const m = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  if (!m) throw new Error("FORBIDDEN");
  return m;
}
