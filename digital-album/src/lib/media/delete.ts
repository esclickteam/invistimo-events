import { prisma } from "../prisma";
import { deleteObject } from "../storage";
import { audit } from "../audit";

/** Soft-delete media and remove derived face indexes / files according to policy. */
export async function deleteMediaCascade(mediaId: string, actorUserId?: string) {
  const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
  if (!media) return;

  await prisma.faceIndex.deleteMany({ where: { mediaId } });
  await prisma.favorite.deleteMany({ where: { mediaId } });

  const keys = [media.storageKey, media.thumbKey, media.previewKey, media.posterKey].filter(
    Boolean
  ) as string[];
  for (const key of keys) {
    await deleteObject(key);
  }

  await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: {
      status: "DELETED",
      deletedAt: new Date(),
      storageKey: `deleted/${media.id}`,
      thumbKey: null,
      previewKey: null,
      posterKey: null,
      faceIndexedAt: null,
      faceCount: 0,
    },
  });

  await prisma.tenant.update({
    where: { id: media.tenantId },
    data: {
      storageUsedBytes: {
        decrement: media.sizeBytes > BigInt(0) ? media.sizeBytes : BigInt(0),
      },
    },
  });

  await audit({
    action: "media.delete",
    actorUserId,
    tenantId: media.tenantId,
    eventId: media.eventId,
    targetType: "MediaAsset",
    targetId: mediaId,
  });
}
