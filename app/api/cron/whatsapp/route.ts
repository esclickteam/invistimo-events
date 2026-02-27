import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import WhatsappQueue from "@/models/WhatsappQueue";

import {
  sendRsvpTemplateMedia,
  type SendRsvpTemplateMediaInput,
} from "@/lib/whatsapp/sendRsvpTemplateMedia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= CONFIG (Vercel Cron Safe) ================= */

const MAX_PER_RUN = 30;
const DELAY_BETWEEN = 1200;
const JITTER_MAX = 250;
const STUCK_SENDING_AFTER_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;

const INC_ATTEMPTS_ON_RECOVERY = false;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRateLimitError(msg: string) {
  const m = msg.toLowerCase();
  return msg.includes("131048") || m.includes("rate") || m.includes("too many");
}

function nowMinus(ms: number) {
  return new Date(Date.now() - ms);
}

function isRsvpTemplate(name: string) {
  return name === "rsvp_invitation_media" || name === "rsvp_reminder_invistimo";
}

export async function GET(req: NextRequest) {
  try {
    // ✅ Guard (Vercel Cron uses Authorization: Bearer <CRON_SECRET>)
    const secret = process.env.CRON_SECRET;

    if (secret) {
      const authHeader = req.headers.get("authorization");

      if (!authHeader || authHeader !== `Bearer ${secret}`) {
        return NextResponse.json(
          { success: false, error: "UNAUTHORIZED" },
          { status: 401 }
        );
      }
    }

    await db();

    // ✅ Recovery: release stuck sending jobs (RSVP only)
    await WhatsappQueue.updateMany(
      {
        status: "sending",
        $or: [
          { lockedAt: { $lt: nowMinus(STUCK_SENDING_AFTER_MS) } },
          { lockedAt: null },
          { lockedAt: { $exists: false } },
        ],
      },
      INC_ATTEMPTS_ON_RECOVERY
        ? { $set: { status: "pending", lockedAt: null }, $inc: { attempts: 1 } }
        : { $set: { status: "pending", lockedAt: null } }
    );

    let processed = 0;
    let sent = 0;
    let failed = 0;
    let skippedNonRsvp = 0;

    for (let i = 0; i < MAX_PER_RUN; i++) {
      // ✅ Atomic lock: take exactly one pending job
      const job = await WhatsappQueue.findOneAndUpdate(
        { status: "pending", attempts: { $lt: MAX_ATTEMPTS } },
        { $set: { status: "sending", lockedAt: new Date() } },
        { sort: { createdAt: 1 }, new: true }
      );

      if (!job) break;
      processed++;

      try {
        const templateName = String(job.templateName);
        const phone = String(job.phone);

        // ✅ RSVP ONLY: anything else -> mark failed & continue
        if (!isRsvpTemplate(templateName)) {
          job.attempts = (job.attempts ?? 0) + 1;
          job.status = "failed";
          job.lastError = `CRON_RSVP_ONLY: unsupported template "${templateName}"`;
          job.lockedAt = null;
          await job.save();
          failed++;
          skippedNonRsvp++;
          continue;
        }

        const payload = (job.payload ?? {}) as Omit<
          SendRsvpTemplateMediaInput,
          "to" | "templateName"
        >;

        const result = await sendRsvpTemplateMedia({
          to: phone,
          ...payload,
          templateName,
        } as SendRsvpTemplateMediaInput);

        job.status = "sent";
        job.sentAt = new Date();
        job.wamid = result?.providerResponse?.messages?.[0]?.id || null;
        job.lastError = null;
        job.lockedAt = null;

        await job.save();

        sent++;

        const jitter = Math.floor(Math.random() * JITTER_MAX);
        await sleep(DELAY_BETWEEN + jitter);
      } catch (err: any) {
        const msg = String(err?.message || err);

        job.attempts = (job.attempts ?? 0) + 1;
        job.lastError = msg;
        job.lockedAt = null;

        if (job.attempts >= MAX_ATTEMPTS) {
          job.status = "failed";
          failed++;
        } else {
          job.status = "pending";
        }

        await job.save();

        if (isRateLimitError(msg)) {
          console.warn("⛔ WhatsApp rate limit detected – stopping cron", msg);
          break;
        }

        await sleep(400);
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      sent,
      failed,
      skippedNonRsvp,
      maxPerRun: MAX_PER_RUN,
      delayBetween: DELAY_BETWEEN,
    });
  } catch (err: any) {
    console.error("❌ WHATSAPP CRON ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        error: "CRON_FAILED",
        details: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}