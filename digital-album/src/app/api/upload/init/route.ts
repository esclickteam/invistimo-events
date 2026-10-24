import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import {
  canUpload,
  loadEventAccess,
  mediaTypeAllowed,
} from "@/lib/permissions";
import { assertCanStoreBytes } from "@/lib/quota";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";
import { buildObjectKey } from "@/lib/storage";

const schema = z.object({
  eventId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(3).max(120),
  totalBytes: z.number().int().positive().max(2 * 1024 ** 3), // 2GB hard cap per file
  checksumSha256: z.string().length(64).optional(),
});

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`upload-init:${ip}`, 60, 60_000);
    if (!rl.ok) return jsonError("יותר מדי בקשות העלאה", 429);

    const body = schema.parse(await req.json());
    if (!ALLOWED.has(body.mimeType)) {
      return jsonError("סוג קובץ לא נתמך", 400);
    }

    const user = await getCurrentUser();
    const access = await loadEventAccess(body.eventId, user?.id);
    if (!access) return jsonError("אירוע לא נמצא", 404);

    const isOwner = Boolean(access.eventMember);
    if (
      !canUpload(access.event, {
        user,
        eventMember: access.eventMember,
        isGuest: !isOwner,
      })
    ) {
      return jsonError("אין הרשאת העלאה", 403);
    }
    if (!mediaTypeAllowed(access.event, body.mimeType)) {
      return jsonError("סוג המדיה אינו מורשה באלבום זה", 403);
    }

    if (body.checksumSha256) {
      const dup = await prisma.mediaAsset.findFirst({
        where: {
          eventId: body.eventId,
          checksumSha256: body.checksumSha256,
          deletedAt: null,
          status: { not: "FAILED" },
        },
      });
      if (dup) {
        return jsonOk({
          duplicate: true,
          mediaId: dup.id,
          status: dup.status,
        });
      }
    }

    await assertCanStoreBytes(access.event.tenantId, body.totalBytes);

    const isVideo = body.mimeType.startsWith("video/");
    const storageKey = buildObjectKey({
      tenantId: access.event.tenantId,
      eventId: access.event.id,
      kind: "original",
      filename: body.fileName,
    });

    const media = await prisma.mediaAsset.create({
      data: {
        eventId: access.event.id,
        tenantId: access.event.tenantId,
        type: isVideo ? "VIDEO" : "PHOTO",
        status: "UPLOADING",
        originalName: body.fileName,
        mimeType: body.mimeType,
        sizeBytes: BigInt(body.totalBytes),
        storageKey,
        checksumSha256: body.checksumSha256,
        uploadedByRole: isOwner ? "owner" : "guest",
      },
    });

    const uploadToken = randomBytes(24).toString("hex");
    const session = await prisma.uploadSession.create({
      data: {
        eventId: access.event.id,
        mediaId: media.id,
        uploadToken: createHash("sha256").update(uploadToken).digest("hex"),
        fileName: body.fileName,
        mimeType: body.mimeType,
        totalBytes: BigInt(body.totalBytes),
        checksumSha256: body.checksumSha256,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 6),
      },
    });

    return jsonOk({
      uploadId: session.id,
      uploadToken,
      mediaId: media.id,
      chunkSize: session.chunkSize,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
