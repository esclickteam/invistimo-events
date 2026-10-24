import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";
import { getActiveEntitlement } from "@/lib/quota";
import { audit } from "@/lib/audit";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("לא נמצא", 404);

    const greetings = await prisma.greeting.findMany({
      where: {
        eventId: event.id,
        status: { in: ["APPROVED", "HIGHLIGHTED"] },
      },
      orderBy: [{ isHighlighted: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return jsonOk({ greetings });
  } catch (e) {
    return handleApiError(e);
  }
}

const schema = z.object({
  authorName: z.string().min(2).max(80),
  body: z.string().min(2).max(2000),
  type: z.enum(["TEXT", "AUDIO", "VIDEO", "PHOTO_DEDICATION"]).default("TEXT"),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`greeting:${ip}`, 10, 60_000);
    if (!rl.ok) return jsonError("יותר מדי ברכות — נסו שוב בעוד רגע", 429);

    const { slug } = await ctx.params;
    const event = await prisma.event.findUnique({ where: { slug } });
    if (!event) return jsonError("לא נמצא", 404);

    const ent = await getActiveEntitlement(event.tenantId, event.id);
    if (!ent?.plan.allowGuestbook) {
      return jsonError("ספר ברכות אינו כלול בחבילה", 403);
    }

    const body = schema.parse(await req.json());
    const greeting = await prisma.greeting.create({
      data: {
        eventId: event.id,
        authorName: body.authorName,
        body: body.body,
        type: body.type,
        status: event.requireApproval ? "PENDING" : "APPROVED",
      },
    });

    await audit({
      action: "greeting.create",
      tenantId: event.tenantId,
      eventId: event.id,
      targetId: greeting.id,
      ip,
    });

    return jsonOk({ greeting });
  } catch (e) {
    return handleApiError(e);
  }
}
