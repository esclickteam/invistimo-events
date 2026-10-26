/**
 * Face AI provider abstraction.
 *
 * IMPORTANT:
 * - FACE_AI_PROVIDER=none by default — feature is NOT presented as live.
 * - Rekognition is wired but will not run without explicit env + approval.
 * - Searches are always scoped to a single event collection.
 */

import { env } from "../env";
import { prisma } from "../prisma";
import { deleteObject, readBuffer } from "../storage";

export type FaceMatch = {
  mediaId: string;
  score: number;
  faceId?: string;
};

export interface FaceProvider {
  name: string;
  isConfigured(): boolean;
  ensureCollection(eventId: string): Promise<string>;
  indexMedia(params: {
    eventId: string;
    mediaId: string;
    imageBytes: Buffer;
  }): Promise<{ faceCount: number; faceIds: string[] }>;
  searchBySelfie(params: {
    eventId: string;
    selfieBytes: Buffer;
    threshold: number;
  }): Promise<FaceMatch[]>;
  deleteCollection(eventId: string): Promise<void>;
}

class NoneFaceProvider implements FaceProvider {
  name = "none";
  isConfigured() {
    return false;
  }
  async ensureCollection(eventId: string): Promise<string> {
    void eventId;
    throw new Error("זיהוי פנים אינו מופעל. נדרש אישור והגדרת ספק.");
  }
  async indexMedia(): Promise<{ faceCount: number; faceIds: string[] }> {
    throw new Error("זיהוי פנים אינו מופעל");
  }
  async searchBySelfie(): Promise<FaceMatch[]> {
    throw new Error("זיהוי פנים אינו מופעל");
  }
  async deleteCollection(eventId: string): Promise<void> {
    void eventId;
  }
}

/** Local deterministic stub for automated tests only — never shown as real AI. */
class LocalDevFaceProvider implements FaceProvider {
  name = "local_dev";
  isConfigured() {
    return process.env.NODE_ENV !== "production";
  }
  async ensureCollection(eventId: string) {
    return `local-${eventId}`;
  }
  async indexMedia(params: { eventId: string; mediaId: string; imageBytes: Buffer }) {
    // Store a content-hash "embedding" for same-image matching in tests
    const { createHash } = await import("crypto");
    const hash = createHash("sha256").update(params.imageBytes).digest("hex").slice(0, 32);
    await prisma.faceIndex.create({
      data: {
        eventId: params.eventId,
        mediaId: params.mediaId,
        provider: "local_dev",
        providerFaceId: hash,
        providerCollectionId: `local-${params.eventId}`,
        confidence: 99,
        bboxJson: JSON.stringify({ left: 0.1, top: 0.1, width: 0.3, height: 0.4 }),
      },
    });
    return { faceCount: 1, faceIds: [hash] };
  }
  async searchBySelfie(params: {
    eventId: string;
    selfieBytes: Buffer;
    threshold: number;
  }) {
    const { createHash } = await import("crypto");
    const hash = createHash("sha256").update(params.selfieBytes).digest("hex").slice(0, 32);
    const faces = await prisma.faceIndex.findMany({
      where: { eventId: params.eventId, provider: "local_dev" },
    });
    const matches: FaceMatch[] = [];
    for (const f of faces) {
      // Exact hash match = 100; otherwise no match (honest — not fake AI)
      const score = f.providerFaceId === hash ? 100 : 0;
      if (score >= params.threshold) {
        matches.push({ mediaId: f.mediaId, score, faceId: f.providerFaceId || undefined });
      }
    }
    return matches;
  }
  async deleteCollection(eventId: string) {
    await prisma.faceIndex.deleteMany({ where: { eventId, provider: "local_dev" } });
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type RekognitionSdk = {
  RekognitionClient: new (cfg: { region: string }) => {
    send: (cmd: unknown) => Promise<any>;
  };
  CreateCollectionCommand: new (input: unknown) => unknown;
  ListCollectionsCommand: new (input?: unknown) => unknown;
  IndexFacesCommand: new (input: unknown) => unknown;
  SearchFacesByImageCommand: new (input: unknown) => unknown;
  DeleteCollectionCommand: new (input: unknown) => unknown;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Loaded only when FACE_AI_PROVIDER=rekognition and package is installed after approval. */
async function loadRekognitionSdk(): Promise<RekognitionSdk> {
  const modName = "@aws-sdk/client-rekognition";
  try {
    // Function form avoids Next/webpack static resolve when SDK is not installed
    const dynamicImport = new Function("m", "return import(m)") as (
      m: string
    ) => Promise<RekognitionSdk>;
    return await dynamicImport(modName);
  } catch {
    throw new Error(
      "חבילת AWS Rekognition אינה מותקנת. התקינו לאחר אישור והפעלת הספק."
    );
  }
}

class RekognitionFaceProvider implements FaceProvider {
  name = "rekognition";
  isConfigured() {
    return Boolean(
      env.faceAiEnabledGlobally &&
        env.awsRegion &&
        env.awsAccessKeyId &&
        env.awsSecretAccessKey
    );
  }
  collectionId(eventId: string) {
    return `${env.rekognitionPrefix}-${eventId}`.slice(0, 255);
  }
  async ensureCollection(eventId: string) {
    const {
      RekognitionClient,
      CreateCollectionCommand,
      ListCollectionsCommand,
    } = await loadRekognitionSdk();
    const client = new RekognitionClient({ region: env.awsRegion });
    const id = this.collectionId(eventId);
    const listed = await client.send(new ListCollectionsCommand({}));
    if (!listed.CollectionIds?.includes(id)) {
      await client.send(new CreateCollectionCommand({ CollectionId: id }));
    }
    return id;
  }
  async indexMedia(params: {
    eventId: string;
    mediaId: string;
    imageBytes: Buffer;
  }) {
    const { RekognitionClient, IndexFacesCommand } = await loadRekognitionSdk();
    const client = new RekognitionClient({ region: env.awsRegion });
    const collectionId = await this.ensureCollection(params.eventId);
    const res = await client.send(
      new IndexFacesCommand({
        CollectionId: collectionId,
        Image: { Bytes: params.imageBytes },
        ExternalImageId: params.mediaId.slice(0, 255),
        DetectionAttributes: ["DEFAULT"],
        MaxFaces: 20,
        QualityFilter: "AUTO",
      })
    );
    const faceIds: string[] = [];
    for (const fr of res.FaceRecords || []) {
      const faceId = fr.Face?.FaceId;
      if (!faceId) continue;
      faceIds.push(faceId);
      const bb = fr.Face?.BoundingBox;
      await prisma.faceIndex.create({
        data: {
          eventId: params.eventId,
          mediaId: params.mediaId,
          provider: "rekognition",
          providerFaceId: faceId,
          providerCollectionId: collectionId,
          confidence: fr.Face?.Confidence,
          bboxJson: bb
            ? JSON.stringify({
                left: bb.Left,
                top: bb.Top,
                width: bb.Width,
                height: bb.Height,
              })
            : null,
        },
      });
    }
    return { faceCount: faceIds.length, faceIds };
  }
  async searchBySelfie(params: {
    eventId: string;
    selfieBytes: Buffer;
    threshold: number;
  }) {
    const { RekognitionClient, SearchFacesByImageCommand } =
      await loadRekognitionSdk();
    const client = new RekognitionClient({ region: env.awsRegion });
    const collectionId = await this.ensureCollection(params.eventId);
    const res = await client.send(
      new SearchFacesByImageCommand({
        CollectionId: collectionId,
        Image: { Bytes: params.selfieBytes },
        FaceMatchThreshold: params.threshold,
        MaxFaces: 100,
      })
    );
    const matches: FaceMatch[] = [];
    for (const m of res.FaceMatches || []) {
      const faceId = m.Face?.FaceId;
      const external = m.Face?.ExternalImageId;
      if (!external || !m.Similarity || m.Similarity < params.threshold) continue;
      matches.push({
        mediaId: external,
        score: m.Similarity,
        faceId,
      });
    }
    return matches;
  }
  async deleteCollection(eventId: string) {
    const { RekognitionClient, DeleteCollectionCommand } =
      await loadRekognitionSdk();
    const client = new RekognitionClient({ region: env.awsRegion });
    await client.send(
      new DeleteCollectionCommand({ CollectionId: this.collectionId(eventId) })
    );
    await prisma.faceIndex.deleteMany({ where: { eventId } });
  }
}

export function getFaceProvider(): FaceProvider {
  if (env.faceAiProvider === "rekognition") return new RekognitionFaceProvider();
  if (env.faceAiProvider === "local_dev") return new LocalDevFaceProvider();
  return new NoneFaceProvider();
}

export function isFaceAiLive(): boolean {
  const p = getFaceProvider();
  return p.name !== "none" && p.isConfigured() && env.faceAiEnabledGlobally;
}

export async function processFaceIndexJob(payload: Record<string, unknown>) {
  if (!isFaceAiLive()) {
    return { skipped: true, reason: "Face AI not enabled" };
  }
  const mediaId = String(payload.mediaId || "");
  const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
  if (!media || media.type !== "PHOTO" || media.status === "DELETED") {
    return { skipped: true };
  }
  const provider = getFaceProvider();
  const bytes = await readBuffer(media.previewKey || media.storageKey);
  await prisma.faceIndex.deleteMany({ where: { mediaId: media.id } });
  const result = await provider.indexMedia({
    eventId: media.eventId,
    mediaId: media.id,
    imageBytes: bytes,
  });
  await prisma.mediaAsset.update({
    where: { id: media.id },
    data: { faceIndexedAt: new Date(), faceCount: result.faceCount },
  });
  return result;
}

export async function purgeFaceSearch(searchId: string) {
  const search = await prisma.faceSearch.findUnique({ where: { id: searchId } });
  if (!search) return;
  if (search.selfieKey) await deleteObject(search.selfieKey);
  await prisma.faceSearch.update({
    where: { id: searchId },
    data: {
      status: "DELETED",
      selfieKey: null,
      matchMediaIdsJson: "[]",
      matchScoresJson: "[]",
      deletedAt: new Date(),
    },
  });
}
