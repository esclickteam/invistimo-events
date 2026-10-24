import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getFaceProvider, isFaceAiLive, purgeFaceSearch } from "@/lib/ai/face-provider";
import { assertAiSearchQuota } from "@/lib/quota";
import { buildObjectKey, putBuffer, signMediaUrl } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";
import { audit } from "@/lib/audit";

const consentSchema = z.object({
  consentAccepted: z.literal(true),
  consentTextVersion: z.string().min(1),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`face:${ip}`, 8, 60_000);
    if (!rl.ok) return jsonError("יותר מדי בקשות", 429);

    const { slug } = await ctx.params;
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("לא נמצא", 404);

    if (!event.faceAiEnabled || !isFaceAiLive()) {
      return jsonError("החיפוש אינו זמין באלבום זה כרגע", 503);
    }

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const searchId = String(form.get("searchId") || "");
      const consent = form.get("consentAccepted") === "true";
      const file = form.get("selfie");
      if (!searchId || !consent || !(file instanceof File)) {
        return jsonError("נדרשים הסכמה, מזהה חיפוש וסלפי", 400);
      }

      const search = await prisma.faceSearch.findUnique({ where: { id: searchId } });
      if (!search || search.eventId !== event.id) return jsonError("חיפוש לא נמצא", 404);
      if (!search.consentAccepted) return jsonError("נדרשת הסכמה מפורשת", 400);

      const entitlement = await assertAiSearchQuota(event.tenantId, event.id);
      const bytes = Buffer.from(await file.arrayBuffer());
      if (bytes.length > 8 * 1024 * 1024) return jsonError("קובץ הסלפי גדול מדי", 400);

      const selfieKey = buildObjectKey({
        tenantId: event.tenantId,
        eventId: event.id,
        kind: "selfie",
        filename: `selfie-${searchId}.jpg`,
      });
      await putBuffer(selfieKey, bytes, { overwrite: true });

      await prisma.faceSearch.update({
        where: { id: searchId },
        data: { status: "PROCESSING", selfieKey },
      });

      try {
        const provider = getFaceProvider();
        const matches = await provider.searchBySelfie({
          eventId: event.id,
          selfieBytes: bytes,
          threshold: event.faceMatchThreshold,
        });
        // Deduplicate media ids, keep highest score
        const best = new Map<string, number>();
        for (const m of matches) {
          best.set(m.mediaId, Math.max(best.get(m.mediaId) || 0, m.score));
        }
        const mediaIds = [...best.keys()];
        const scores = mediaIds.map((id) => best.get(id) || 0);

        await prisma.faceSearch.update({
          where: { id: searchId },
          data: {
            status: mediaIds.length ? "READY" : "NO_MATCH",
            matchMediaIdsJson: JSON.stringify(mediaIds),
            matchScoresJson: JSON.stringify(scores),
            provider: provider.name,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1h then purge selfie
          },
        });

        await prisma.entitlement.update({
          where: { id: entitlement.id },
          data: { aiSearchesUsed: { increment: 1 } },
        });

        await audit({
          action: "face.search",
          tenantId: event.tenantId,
          eventId: event.id,
          targetId: searchId,
          ip,
          meta: { matches: mediaIds.length, provider: provider.name },
        });

        const media = await prisma.mediaAsset.findMany({
          where: {
            id: { in: mediaIds },
            eventId: event.id,
            status: "APPROVED",
            deletedAt: null,
          },
        });

        return jsonOk({
          status: mediaIds.length ? "READY" : "NO_MATCH",
          matches: media.map((m) => ({
            id: m.id,
            score: best.get(m.id),
            url: signMediaUrl(m.previewKey || m.storageKey),
            thumbUrl: signMediaUrl(m.thumbKey || m.storageKey),
          })),
        });
      } catch (err) {
        await prisma.faceSearch.update({
          where: { id: searchId },
          data: {
            status: "FAILED",
            errorMessage: err instanceof Error ? err.message : String(err),
          },
        });
        throw err;
      }
    }

    // Step 1: create search after consent
    const body = consentSchema.parse(await req.json());
    const search = await prisma.faceSearch.create({
      data: {
        eventId: event.id,
        consentAccepted: body.consentAccepted,
        consentAt: new Date(),
        status: "PENDING_CONSENT",
        provider: getFaceProvider().name,
      },
    });
    // Immediately mark ready for selfie after consent recorded
    await prisma.faceSearch.update({
      where: { id: search.id },
      data: { status: "PENDING_CONSENT" },
    });

    return jsonOk({
      searchId: search.id,
      notice:
        "התמונה והמידע הביומטרי ישמשו רק לחיפוש באלבום זה ויימחקו לפי מדיניות השמירה.",
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("לא נמצא", 404);
    const { searchId } = (await req.json()) as { searchId?: string };
    if (!searchId) return jsonError("חסר searchId", 400);
    const search = await prisma.faceSearch.findUnique({ where: { id: searchId } });
    if (!search || search.eventId !== event.id) return jsonError("לא נמצא", 404);
    await purgeFaceSearch(searchId);
    await audit({
      action: "face.search.purge",
      tenantId: event.tenantId,
      eventId: event.id,
      targetId: searchId,
    });
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
