import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";
import { slugify } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  tenantName: z.string().min(2).max(80).optional(),
});

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`register:${ip}`, 10, 60_000);
    if (!rl.ok) return jsonError("יותר מדי ניסיונות", 429);

    const body = schema.parse(await req.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) return jsonError("כתובת האימייל כבר רשומה", 409);

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name,
        passwordHash,
        role: "TENANT_OWNER",
      },
    });

    const baseSlug = slugify(body.tenantName || body.name) || `tenant-${user.id.slice(-6)}`;
    let slug = baseSlug;
    let i = 1;
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${i++}`;
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: body.tenantName || body.name,
        slug,
        billingEmail: user.email,
        members: { create: { userId: user.id, role: "TENANT_OWNER" } },
      },
    });

    const classic = await prisma.plan.findUnique({ where: { code: "classic" } });
    if (classic) {
      await prisma.entitlement.create({
        data: {
          tenantId: tenant.id,
          planId: classic.id,
          source: "SELF_SERVE",
          status: "active",
        },
      });
    }

    await createSession(user, { ip, ua: req.headers.get("user-agent") || undefined });
    await audit({
      action: "auth.register",
      actorUserId: user.id,
      tenantId: tenant.id,
      ip,
    });

    return jsonOk({
      user: { id: user.id, email: user.email, name: user.name },
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
