/**
 * Seed sample photos into the Mia & Alon demo album.
 * Safe for local/dev only — downloads public Unsplash sample images.
 */
import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";
import { putBuffer, buildObjectKey, ensureStorageDirs } from "../src/lib/storage";
import { processThumbnailJob } from "../src/lib/media/thumbnails";

const prisma = new PrismaClient();

const SAMPLES = [
  {
    name: "ceremony-1.jpg",
    url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    chapter: "חופה",
  },
  {
    name: "couple-1.jpg",
    url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80",
    chapter: "לפני הכל",
  },
  {
    name: "bouquet-1.jpg",
    url: "https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1200&q=80",
    chapter: "הכנות",
  },
  {
    name: "party-1.jpg",
    url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80",
    chapter: "המסיבה",
  },
  {
    name: "rings-1.jpg",
    url: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80",
    chapter: "הכנות",
  },
  {
    name: "guests-1.jpg",
    url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80",
    chapter: "קבלת פנים",
  },
  {
    name: "dance-1.jpg",
    url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
    chapter: "רחבת הריקודים",
  },
  {
    name: "table-1.jpg",
    url: "https://images.unsplash.com/photo-1478144592103-25e218a04891?auto=format&fit=crop&w=1200&q=80",
    chapter: "המסיבה",
  },
  {
    name: "portrait-1.jpg",
    url: "https://images.unsplash.com/photo-1460978812857-470ed1c77af0?auto=format&fit=crop&w=1200&q=80",
    chapter: "לפני הכל",
  },
];

async function main() {
  await ensureStorageDirs();

  const event = await prisma.event.findUnique({
    where: { slug: "mia-alon-wedding" },
    include: { stories: true },
  });
  if (!event) throw new Error("Demo event mia-alon-wedding not found. Run npm run db:seed first.");

  const chapterByTitle = new Map(event.stories.map((s) => [s.title, s.id]));

  // Clear previous demo sample uploads (keep real uploads if any) — mark by uploaderName
  const old = await prisma.mediaAsset.findMany({
    where: { eventId: event.id, uploaderName: "demo-seed" },
  });
  for (const m of old) {
    await prisma.mediaAsset.delete({ where: { id: m.id } });
  }

  let ok = 0;
  for (const sample of SAMPLES) {
    const res = await fetch(sample.url);
    if (!res.ok) {
      console.warn("skip", sample.name, res.status);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const checksum = createHash("sha256").update(buf).digest("hex");

    const storageKey = buildObjectKey({
      tenantId: event.tenantId,
      eventId: event.id,
      kind: "original",
      filename: sample.name,
    });
    await putBuffer(storageKey, buf, { overwrite: true });

    const media = await prisma.mediaAsset.create({
      data: {
        eventId: event.id,
        tenantId: event.tenantId,
        storyChapterId: chapterByTitle.get(sample.chapter) || null,
        type: "PHOTO",
        status: "PROCESSING",
        originalName: sample.name,
        mimeType: "image/jpeg",
        sizeBytes: BigInt(buf.length),
        storageKey,
        checksumSha256: checksum,
        uploadedByRole: "owner",
        uploaderName: "demo-seed",
      },
    });

    await processThumbnailJob({ mediaId: media.id });
    await prisma.mediaAsset.update({
      where: { id: media.id },
      data: { status: "APPROVED" },
    });
    ok += 1;
    console.log("✓", sample.name, "→", sample.chapter);
  }

  await prisma.tenant.update({
    where: { id: event.tenantId },
    data: {
      storageUsedBytes: (
        await prisma.mediaAsset.aggregate({
          where: { tenantId: event.tenantId, deletedAt: null },
          _sum: { sizeBytes: true },
        })
      )._sum.sizeBytes || BigInt(0),
    },
  });

  console.log(`\nDone. ${ok} photos approved in /a/${event.slug}`);
  console.log("Owner login: owner@album.local / OwnerDemo!23");
  console.log("Admin login: admin@album.local / AlbumAdmin!23");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
