import sharp from "sharp";
import { prisma } from "../prisma";
import { absPathForKey, buildObjectKey, putBuffer, readBuffer } from "../storage";

export async function processThumbnailJob(payload: Record<string, unknown>) {
  const mediaId = String(payload.mediaId || "");
  const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
  if (!media || media.type !== "PHOTO") {
    return { skipped: true };
  }

  const original = await readBuffer(media.storageKey);
  const meta = await sharp(original).metadata();

  const thumb = await sharp(original)
    .rotate()
    .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  const preview = await sharp(original)
    .rotate()
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  const thumbKey = buildObjectKey({
    tenantId: media.tenantId,
    eventId: media.eventId,
    kind: "thumb",
    filename: `${media.id}-thumb.jpg`,
  });
  const previewKey = buildObjectKey({
    tenantId: media.tenantId,
    eventId: media.eventId,
    kind: "preview",
    filename: `${media.id}-preview.jpg`,
  });

  await putBuffer(thumbKey, thumb, { overwrite: true });
  await putBuffer(previewKey, preview, { overwrite: true });

  const event = await prisma.event.findUnique({ where: { id: media.eventId } });
  const nextStatus =
    media.status === "PROCESSING" || media.status === "UPLOADING"
      ? event?.requireApproval
        ? "PENDING_APPROVAL"
        : "APPROVED"
      : media.status;

  await prisma.mediaAsset.update({
    where: { id: media.id },
    data: {
      thumbKey,
      previewKey,
      width: meta.width,
      height: meta.height,
      status: nextStatus,
    },
  });

  if (event?.faceAiEnabled) {
    const { enqueueJob } = await import("../jobs");
    await enqueueJob({
      type: "FACE_INDEX",
      tenantId: media.tenantId,
      eventId: media.eventId,
      payload: { mediaId: media.id },
    });
  }

  return { thumbKey, previewKey, abs: absPathForKey(thumbKey) };
}
