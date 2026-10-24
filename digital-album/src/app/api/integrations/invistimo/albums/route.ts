/**
 * Invistimo → Digital Album integration API.
 *
 * Lifecycle note: Creating/linking an album here does NOT couple album retention
 * to Invistimo event deletion. Album retentionUntil is independent.
 *
 * Auth: partner client credentials (dev stub). Enable with INVISTIMO_INTEGRATION_ENABLED=true.
 */

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { audit } from "@/lib/audit";

async function authorizePartner(req: Request) {
  if (!env.invistimoIntegrationEnabled) {
    throw new Error("אינטגרציית Invistimo כבויה בסביבה זו");
  }
  const clientId = req.headers.get("x-partner-client-id") || "";
  const clientSecret = req.headers.get("x-partner-client-secret") || "";
  const cred = await prisma.integrationCredential.findUnique({ where: { clientId } });
  if (!cred || !cred.isActive || cred.partner !== "invistimo") {
    throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  }
  const ok = await bcrypt.compare(clientSecret, cred.clientSecretHash);
  if (!ok) throw Object.assign(new Error("UNAUTHORIZED"), { status: 401 });
  return cred;
}

const createSchema = z.object({
  invistimoEventId: z.string().min(1),
  invistimoTenantId: z.string().min(1),
  hostNames: z.string().min(2),
  title: z.string().min(2).optional(),
  eventDate: z.string().datetime().optional(),
  planCode: z.enum(["classic", "premium", "luxury_ai"]).default("classic"),
  externalOrderRef: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    await authorizePartner(req);
    const body = createSchema.parse(await req.json());

    const existing = await prisma.event.findUnique({
      where: { invistimoEventId: body.invistimoEventId },
    });
    if (existing) {
      return jsonOk({
        album: {
          id: existing.id,
          slug: existing.slug,
          url: `${env.appUrl}/a/${existing.slug}`,
          alreadyLinked: true,
        },
      });
    }

    let tenant = await prisma.tenant.findFirst({
      where: { slug: `invistimo-${body.invistimoTenantId}` },
    });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: `Invistimo ${body.invistimoTenantId}`,
          slug: `invistimo-${body.invistimoTenantId}`,
        },
      });
    }

    const plan = await prisma.plan.findUniqueOrThrow({ where: { code: body.planCode } });
    await prisma.entitlement.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        source: "INVISTIMO",
        externalRef: body.externalOrderRef || body.invistimoEventId,
        status: "active",
        retentionUntil: new Date(
          Date.now() + plan.retentionDays * 24 * 60 * 60 * 1000
        ),
      },
    });

    let slug = slugify(body.hostNames) || `event-${body.invistimoEventId.slice(-6)}`;
    if (await prisma.event.findUnique({ where: { slug } })) {
      slug = `${slug}-${body.invistimoEventId.slice(-4)}`;
    }

    const event = await prisma.event.create({
      data: {
        tenantId: tenant.id,
        title: body.title || "האלבום שלנו",
        hostNames: body.hostNames,
        eventDate: body.eventDate ? new Date(body.eventDate) : null,
        slug,
        status: "published",
        invistimoEventId: body.invistimoEventId,
        invistimoTenantId: body.invistimoTenantId,
        retentionUntil: new Date(
          Date.now() + plan.retentionDays * 24 * 60 * 60 * 1000
        ),
        albums: { create: { title: "האלבום שלנו", isPrimary: true } },
        liveSession: { create: {} },
      },
    });

    await audit({
      action: "integration.invistimo.album.create",
      tenantId: tenant.id,
      eventId: event.id,
      meta: { invistimoEventId: body.invistimoEventId },
    });

    return jsonOk({
      album: {
        id: event.id,
        slug: event.slug,
        url: `${env.appUrl}/a/${event.slug}`,
        retentionUntil: event.retentionUntil,
        // Explicit contract: Invistimo deletion must NOT cascade-delete this album
        independentLifecycle: true,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return jsonError("אימות שותף נכשל", 401);
    }
    return handleApiError(e);
  }
}
