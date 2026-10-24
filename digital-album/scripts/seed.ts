import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const themes = [
  {
    code: "ivory-champagne",
    nameHe: "שנהב ושמפניה",
    nameEn: "Ivory Champagne",
    tokensJson: JSON.stringify({
      bg: "#F7F1E8",
      bgAlt: "#EFE6D8",
      ink: "#1C1917",
      muted: "#6B645C",
      gold: "#C4A574",
      goldSoft: "#E8D5B5",
      stone: "#D6CBB8",
      card: "#FFFCF7",
    }),
    sortOrder: 1,
  },
  {
    code: "noir-gold",
    nameHe: "נואר וזהב",
    nameEn: "Noir Gold",
    tokensJson: JSON.stringify({
      bg: "#F5F0E9",
      bgAlt: "#EAE3D7",
      ink: "#0F0E0C",
      muted: "#5C564E",
      gold: "#B8956A",
      goldSoft: "#DFC9A5",
      stone: "#C9BCA8",
      card: "#FFFCFA",
    }),
    sortOrder: 2,
  },
  {
    code: "garden-stone",
    nameHe: "גן ואבן",
    nameEn: "Garden Stone",
    tokensJson: JSON.stringify({
      bg: "#F3EFE7",
      bgAlt: "#E7E0D3",
      ink: "#22201C",
      muted: "#6A655C",
      gold: "#A8926A",
      goldSoft: "#D9CBB0",
      stone: "#C4B8A4",
      card: "#FAF7F1",
    }),
    sortOrder: 3,
  },
];

async function main() {
  for (const t of themes) {
    await prisma.designTheme.upsert({
      where: { code: t.code },
      create: t,
      update: t,
    });
  }

  const plans = [
    {
      code: "classic",
      nameHe: "Classic",
      nameEn: "Classic",
      descriptionHe: "אלבום דיגיטלי, תמונות, סרטונים, QR והרשאות",
      descriptionEn: "Digital album, photos, videos, QR and permissions",
      maxEvents: 1,
      maxStorageBytes: BigInt(10 * 1024 ** 3),
      maxPhotos: 5000,
      maxVideos: 200,
      maxAiFaceSearches: 0,
      maxSummaryFilms: 0,
      retentionDays: 365,
      allowFaceAi: false,
      allowStories: false,
      allowGuestbook: false,
      allowLive: true,
      allowTimeCapsule: false,
      allowSummaryFilm: false,
      allowPrintAlbum: false,
      priceOnceAgorot: 29900,
      priceMonthlyAgorot: 0,
      sortOrder: 1,
    },
    {
      code: "premium",
      nameHe: "Premium",
      nameEn: "Premium",
      descriptionHe: "Classic + זיהוי פנים, Stories וספר ברכות",
      descriptionEn: "Classic + face AI, Stories and guestbook",
      maxEvents: 3,
      maxStorageBytes: BigInt(50 * 1024 ** 3),
      maxPhotos: 20000,
      maxVideos: 1000,
      maxAiFaceSearches: 500,
      maxSummaryFilms: 0,
      retentionDays: 730,
      allowFaceAi: true,
      allowStories: true,
      allowGuestbook: true,
      allowLive: true,
      allowTimeCapsule: false,
      allowSummaryFilm: false,
      allowPrintAlbum: true,
      priceOnceAgorot: 59900,
      priceMonthlyAgorot: 14900,
      sortOrder: 2,
    },
    {
      code: "luxury_ai",
      nameHe: "Luxury AI",
      nameEn: "Luxury AI",
      descriptionHe: "Premium + סרט סיכום AI, קפסולת זמן ואפשרויות מתקדמות",
      descriptionEn: "Premium + AI film, time capsule and advanced options",
      maxEvents: 10,
      maxStorageBytes: BigInt(200 * 1024 ** 3),
      maxPhotos: 100000,
      maxVideos: 5000,
      maxAiFaceSearches: 5000,
      maxSummaryFilms: 10,
      retentionDays: 1825,
      allowFaceAi: true,
      allowStories: true,
      allowGuestbook: true,
      allowLive: true,
      allowTimeCapsule: true,
      allowSummaryFilm: true,
      allowPrintAlbum: true,
      priceOnceAgorot: 129900,
      priceMonthlyAgorot: 39900,
      sortOrder: 3,
    },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { code: p.code },
      create: p,
      update: p,
    });
  }

  const passwordHash = await bcrypt.hash("AlbumAdmin!23", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@album.local" },
    create: {
      email: "admin@album.local",
      name: "מנהל על",
      passwordHash,
      role: "SUPER_ADMIN",
    },
    update: { passwordHash, role: "SUPER_ADMIN" },
  });

  const ownerHash = await bcrypt.hash("OwnerDemo!23", 12);
  const owner = await prisma.user.upsert({
    where: { email: "owner@album.local" },
    create: {
      email: "owner@album.local",
      name: "מיה כהן",
      passwordHash: ownerHash,
      role: "TENANT_OWNER",
    },
    update: { passwordHash: ownerHash },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: "mia-alon" },
    create: {
      name: "מיה ואלון",
      slug: "mia-alon",
      billingEmail: owner.email,
    },
    update: {},
  });

  await prisma.tenantMember.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: owner.id } },
    create: { tenantId: tenant.id, userId: owner.id, role: "TENANT_OWNER" },
    update: {},
  });

  const premium = await prisma.plan.findUniqueOrThrow({ where: { code: "premium" } });
  const existingEnt = await prisma.entitlement.findFirst({
    where: { tenantId: tenant.id, planId: premium.id, status: "active" },
  });
  if (!existingEnt) {
    await prisma.entitlement.create({
      data: {
        tenantId: tenant.id,
        planId: premium.id,
        source: "ADMIN_GRANT",
        status: "active",
      },
    });
  }

  const theme = await prisma.designTheme.findUniqueOrThrow({
    where: { code: "ivory-champagne" },
  });

  const event = await prisma.event.upsert({
    where: { slug: "mia-alon-wedding" },
    create: {
      tenantId: tenant.id,
      type: "WEDDING",
      title: "החתונה שלנו",
      hostNames: "מיה ואלון",
      eventDate: new Date("2026-10-24T18:00:00+03:00"),
      personalMessage: "שמחים לחלוק איתכם את הרגעים שלנו",
      slug: "mia-alon-wedding",
      uploadMode: "EVERYONE",
      mediaAllowed: "BOTH",
      visibility: "UNLISTED",
      allowDownload: true,
      allowZip: true,
      requireApproval: true,
      faceAiEnabled: false, // not live until provider approved
      themeId: theme.id,
      status: "published",
      openAt: new Date("2026-10-01T00:00:00+03:00"),
      retentionUntil: new Date("2028-10-24T00:00:00+03:00"),
    },
    update: {
      status: "published",
      uploadMode: "EVERYONE",
      requireApproval: true,
    },
  });

  await prisma.eventMember.upsert({
    where: { eventId_userId: { eventId: event.id, userId: owner.id } },
    create: { eventId: event.id, userId: owner.id, role: "owner" },
    update: {},
  });

  const existingAlbum = await prisma.album.findFirst({ where: { eventId: event.id } });
  if (!existingAlbum) {
    await prisma.album.create({
      data: { eventId: event.id, title: "האלבום שלנו", isPrimary: true },
    });
  }

  const chapters = [
    "לפני הכל",
    "הכנות",
    "קבלת פנים",
    "חופה",
    "המסיבה",
    "רחבת הריקודים",
  ];
  const existingChapters = await prisma.storyChapter.count({ where: { eventId: event.id } });
  if (existingChapters === 0) {
    for (let i = 0; i < chapters.length; i++) {
      await prisma.storyChapter.create({
        data: {
          eventId: event.id,
          title: chapters[i],
          sortOrder: i + 1,
        },
      });
    }
  }

  await prisma.liveSession.upsert({
    where: { eventId: event.id },
    create: { eventId: event.id, isActive: false },
    update: {},
  });

  await prisma.qrToken.upsert({
    where: { token: "demo-qr-mia-alon" },
    create: { eventId: event.id, label: "QR ראשי", token: "demo-qr-mia-alon" },
    update: {},
  });

  await prisma.integrationCredential.upsert({
    where: { clientId: "invistimo-dev" },
    create: {
      partner: "invistimo",
      clientId: "invistimo-dev",
      clientSecretHash: await bcrypt.hash("invistimo-dev-secret", 12),
      scopesJson: JSON.stringify([
        "albums:create",
        "albums:read",
        "albums:entitlements",
      ]),
      isActive: true,
    },
    update: { isActive: true },
  });

  console.log("Seed complete");
  console.log({
    admin: { email: admin.email, password: "AlbumAdmin!23" },
    owner: { email: owner.email, password: "OwnerDemo!23" },
    albumUrl: `/a/${event.slug}`,
    portal: "/portal",
    adminUrl: "/admin",
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
