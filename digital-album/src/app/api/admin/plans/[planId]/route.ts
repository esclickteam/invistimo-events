import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";

const schema = z.object({
  nameHe: z.string().optional(),
  descriptionHe: z.string().optional(),
  maxEvents: z.number().int().positive().optional(),
  maxStorageBytes: z.number().int().positive().optional(),
  maxPhotos: z.number().int().positive().optional(),
  maxVideos: z.number().int().positive().optional(),
  maxAiFaceSearches: z.number().int().min(0).optional(),
  maxSummaryFilms: z.number().int().min(0).optional(),
  retentionDays: z.number().int().positive().optional(),
  allowFaceAi: z.boolean().optional(),
  allowStories: z.boolean().optional(),
  allowGuestbook: z.boolean().optional(),
  allowLive: z.boolean().optional(),
  allowTimeCapsule: z.boolean().optional(),
  allowSummaryFilm: z.boolean().optional(),
  allowPrintAlbum: z.boolean().optional(),
  priceOnceAgorot: z.number().int().min(0).optional(),
  priceMonthlyAgorot: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ planId: string }> }
) {
  try {
    const user = await requireUser(["SUPER_ADMIN"]);
    const { planId } = await ctx.params;
    const body = schema.parse(await req.json());
    const data: Record<string, unknown> = { ...body };
    if (body.maxStorageBytes != null) {
      data.maxStorageBytes = BigInt(body.maxStorageBytes);
    }
    const plan = await prisma.plan.update({
      where: { id: planId },
      data,
    });
    await audit({
      action: "admin.plan.update",
      actorUserId: user.id,
      targetType: "Plan",
      targetId: planId,
      meta: body,
    });
    return jsonOk({ plan: { ...plan, maxStorageBytes: Number(plan.maxStorageBytes) } });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ planId: string }> }
) {
  try {
    await requireUser(["SUPER_ADMIN"]);
    const { planId } = await ctx.params;
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return jsonError("לא נמצא", 404);
    return jsonOk({ plan: { ...plan, maxStorageBytes: Number(plan.maxStorageBytes) } });
  } catch (e) {
    return handleApiError(e);
  }
}
