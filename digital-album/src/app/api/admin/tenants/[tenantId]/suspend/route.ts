import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["active", "suspended", "closed"]),
  reason: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ tenantId: string }> }
) {
  try {
    const user = await requireUser(["SUPER_ADMIN"]);
    const { tenantId } = await ctx.params;
    const body = schema.parse(await req.json());
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { status: body.status },
    });
    await audit({
      action: "admin.tenant.status",
      actorUserId: user.id,
      tenantId,
      meta: body,
    });
    return jsonOk({ tenant });
  } catch (e) {
    return handleApiError(e);
  }
}
