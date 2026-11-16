import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import WhatsappHeaderProbe from "@/models/WhatsappHeaderProbe";
import {
  publicProbeList,
  runWhatsappHeaderProbe,
  whatsappHeaderProbeArmed,
  whatsappHeaderProbeOnProduction,
  type WhatsappHeaderProbeRecord,
  type WhatsappHeaderProbeStore,
} from "@/lib/whatsapp/headerProbe";
import { readLiveDialogTemplateHeaders } from "@/lib/whatsapp/dialogTemplateHeaders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mongoStore(): WhatsappHeaderProbeStore {
  return {
    async list() {
      const rows = await WhatsappHeaderProbe.find()
        .select("mode state messageId httpStatus provider errorCode errorMessage at")
        .lean();
      return rows.map(toRecord);
    },
    async reserve(mode) {
      try {
        await WhatsappHeaderProbe.create({
          mode,
          state: "reserved",
          provider: "dialog",
          at: new Date(),
        });
        return "ok";
      } catch (error: any) {
        if (error?.code === 11000) return "duplicate";
        throw error;
      }
    },
    async complete(mode, result) {
      await WhatsappHeaderProbe.updateOne(
        { mode },
        {
          $set: {
            state: "sent",
            messageId: result.messageId,
            httpStatus: result.httpStatus,
            provider: "dialog",
            errorCode: result.errorCode,
            errorMessage: result.errorMessage,
            at: result.at ? new Date(result.at) : new Date(),
          },
        }
      );
    },
    async release(mode) {
      await WhatsappHeaderProbe.deleteOne({ mode, state: "reserved" });
    },
  };
}

function toRecord(row: any): WhatsappHeaderProbeRecord {
  return {
    mode: row.mode,
    state: row.state,
    messageId: String(row.messageId || ""),
    httpStatus: Number(row.httpStatus || 0),
    provider: "dialog",
    errorCode: String(row.errorCode || ""),
    errorMessage: String(row.errorMessage || ""),
    at: row.at ? new Date(row.at).toISOString() : null,
  };
}

async function requireRealAdmin(req: NextRequest) {
  const auth = await getUserIdFromRequest(req);
  if (!auth?.userId) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (auth.role !== "admin" || auth.impersonated) {
    return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
  }
  return null;
}

function statusBody(records: WhatsappHeaderProbeRecord[]) {
  return {
    success: true,
    armed: whatsappHeaderProbeArmed(),
    production: whatsappHeaderProbeOnProduction(),
    provider: "dialog",
    template: "rsvp_invitation_media",
    recipientLocked: true,
    limit: 2,
    used: publicProbeList(records),
  };
}

export async function GET(req: NextRequest) {
  const denied = await requireRealAdmin(req);
  if (denied) return denied;
  await connectDB();
  const records = await mongoStore().list();
  const templates = await readLiveDialogTemplateHeaders().catch(() => ({
    ok: false as const,
    status: 0,
    templates: [],
    error: "TEMPLATES_UNAVAILABLE",
  }));
  return NextResponse.json({
    ...statusBody(records),
    templateHeaders: templates.templates,
    templateRead: templates.ok ? "ok" : templates.error,
    templateHttpStatus: templates.status,
  });
}

export async function POST(req: NextRequest) {
  const denied = await requireRealAdmin(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  await connectDB();
  try {
    const result = await runWhatsappHeaderProbe(body?.mode, {
      store: mongoStore(),
      armed: whatsappHeaderProbeArmed(),
      production: whatsappHeaderProbeOnProduction(),
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return NextResponse.json(
      {
        success: false,
        error: error?.code || "PROBE_FAILED",
      },
      { status }
    );
  }
}
