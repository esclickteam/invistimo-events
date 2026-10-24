import { createHash } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { readBuffer } from "@/lib/storage";
import { addStorageUsage } from "@/lib/quota";
import { enqueueJob, processNextJobs } from "@/lib/jobs";
import { audit } from "@/lib/audit";

const schema = z.object({
  uploadId: z.string(),
  uploadToken: z.string(),
  uploaderName: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const session = await prisma.uploadSession.findUnique({ where: { id: body.uploadId } });
    if (!session) return jsonError("העלאה לא נמצאה", 404);

    const tokenHash = createHash("sha256").update(body.uploadToken).digest("hex");
    if (tokenHash !== session.uploadToken) return jsonError("טוקן לא תקין", 401);
    if (session.status !== "active") return jsonError("העלאה כבר הושלמה או בוטלה", 409);

    const media = session.mediaId
      ? await prisma.mediaAsset.findUnique({ where: { id: session.mediaId } })
      : null;
    if (!media) return jsonError("מדיה לא נמצאה", 404);

    const file = await readBuffer(media.storageKey);
    if (BigInt(file.length) !== session.totalBytes) {
      return jsonError(
        `גודל הקובץ לא תואם (התקבל ${file.length}, צפוי ${session.totalBytes})`,
        400
      );
    }

    const checksum = createHash("sha256").update(file).digest("hex");
    if (session.checksumSha256 && session.checksumSha256 !== checksum) {
      await prisma.mediaAsset.update({
        where: { id: media.id },
        data: { status: "FAILED" },
      });
      return jsonError("בדיקת checksum נכשלה", 400);
    }

    await prisma.uploadSession.update({
      where: { id: session.id },
      data: { status: "completed", receivedBytes: BigInt(file.length) },
    });

    await prisma.mediaAsset.update({
      where: { id: media.id },
      data: {
        status: "PROCESSING",
        checksumSha256: checksum,
        sizeBytes: BigInt(file.length),
        uploaderName: body.uploaderName,
      },
    });

    await addStorageUsage(media.tenantId, file.length);

    if (media.type === "PHOTO") {
      await enqueueJob({
        type: "THUMBNAIL",
        tenantId: media.tenantId,
        eventId: media.eventId,
        payload: { mediaId: media.id },
      });
    } else {
      await enqueueJob({
        type: "VIDEO_TRANSCODE",
        tenantId: media.tenantId,
        eventId: media.eventId,
        payload: { mediaId: media.id },
      });
    }

    const live = await prisma.liveSession.findUnique({ where: { eventId: media.eventId } });
    if (live) {
      await prisma.liveQueueItem.create({
        data: {
          liveSessionId: live.id,
          mediaId: media.id,
          status: "pending",
        },
      });
    }

    // Process immediately in dev so acceptance tests don't wait for a worker
    await processNextJobs(3);

    await audit({
      action: "media.upload.complete",
      tenantId: media.tenantId,
      eventId: media.eventId,
      targetType: "MediaAsset",
      targetId: media.id,
    });

    const refreshed = await prisma.mediaAsset.findUnique({ where: { id: media.id } });
    return jsonOk({
      mediaId: media.id,
      status: refreshed?.status,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
