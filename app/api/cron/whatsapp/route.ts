import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import WhatsappQueue from "@/models/WhatsappQueue";
import Invitation from "@/models/Invitation";

import {
  sendRsvpTemplateMedia,
  type SendRsvpTemplateMediaInput,
} from "@/lib/whatsapp/sendRsvpTemplateMedia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= CONFIG ================= */

const MAX_PER_RUN = 30;
const DELAY_BETWEEN = 1200;
const JITTER_MAX = 250;
const STUCK_SENDING_AFTER_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;

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
    /* ================= GUARD ================= */

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

    /* ================= RECOVERY ================= */

    await WhatsappQueue.updateMany(
      {
        status: "sending",
        $or: [
          { lockedAt: { $lt: nowMinus(STUCK_SENDING_AFTER_MS) } },
          { lockedAt: null },
          { lockedAt: { $exists: false } },
        ],
      },
      { $set: { status: "pending", lockedAt: null } }
    );

    let processed = 0;
    let sent = 0;
    let failed = 0;

    /* ================= MAIN LOOP ================= */

    for (let i = 0; i < MAX_PER_RUN; i++) {
      const job = await WhatsappQueue.findOneAndUpdate(
        { status: "pending", attempts: { $lt: MAX_ATTEMPTS } },
        { $set: { status: "sending", lockedAt: new Date() } },
        { sort: { createdAt: 1 }, new: true }
      );

      if (!job) break;
      processed++;

      try {
        const templateName = String(job.templateName);

        if (!isRsvpTemplate(templateName)) {
          job.status = "failed";
          job.lastError = "CRON_RSVP_ONLY";
          job.lockedAt = null;
          await job.save();
          failed++;
          continue;
        }

        const payload = job.payload as Omit<
          SendRsvpTemplateMediaInput,
          "to" | "templateName"
        >;

        const result = await sendRsvpTemplateMedia({
          to: job.phone,
          ...payload,
          templateName,
        });

        job.status = "sent";
        job.sentAt = new Date();
        job.wamid = result?.providerResponse?.messages?.[0]?.id || null;
        job.lastError = null;
        job.lockedAt = null;

        await job.save();
        sent++;

        /* ================= PROFESSIONAL ROUND COMPLETION CHECK ================= */

        const remaining = await WhatsappQueue.countDocuments({
          invitationId: job.invitationId,
          templateName: job.templateName,
          status: { $in: ["pending", "sending"] },
        });

        if (remaining === 0) {
          if (job.templateName === "rsvp_invitation_media") {
            await Invitation.updateOne(
              { _id: job.invitationId, rsvpRound1SentAt: null },
              { $set: { rsvpRound1SentAt: new Date() } }
            );
          }

          if (job.templateName === "rsvp_reminder_invistimo") {
            await Invitation.updateOne(
              { _id: job.invitationId, rsvpRound2SentAt: null },
              { $set: { rsvpRound2SentAt: new Date() } }
            );
          }
        }

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
    });
  } catch (err: any) {
    console.error("❌ WHATSAPP CRON ERROR:", err);
    return NextResponse.json(
      { success: false, error: "CRON_FAILED" },
      { status: 500 }
    );
  }
}