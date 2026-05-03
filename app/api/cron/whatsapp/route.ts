import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import WhatsappQueue from "@/models/tempQueue";
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

const RSVP_TEMPLATES = [
  "rsvp_invitation_media",
  "rsvp_reminder_invistimo",
];

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

/* ================= ROUTE ================= */

export async function GET(req: NextRequest) {
  try {
    /* ================= GUARD ================= */

    const secret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const isVercelCron = req.headers.get("x-vercel-cron") === "1";

    if (secret) {
      const isValidBearer = authHeader === `Bearer ${secret}`;
      if (!isValidBearer && !isVercelCron) {
        return NextResponse.json(
          { success: false, error: "UNAUTHORIZED" },
          { status: 401 }
        );
      }
    }

    await db();

    /* ================= 🔥 NEW: RELEASE SCHEDULED ================= */

    await WhatsappQueue.updateMany(
      {
        status: "scheduled",
        scheduledAt: { $lte: new Date() },
      },
      {
        $set: { status: "pending" },
      }
    );

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
        {
          status: "pending",
          attempts: { $lt: MAX_ATTEMPTS },
          templateName: { $in: RSVP_TEMPLATES },
        },
        { $set: { status: "sending", lockedAt: new Date() } },
        { sort: { createdAt: 1 }, new: true }
      );

      if (!job) break;
      processed++;

      try {
        const payload = job.payload as Omit<
          SendRsvpTemplateMediaInput,
          "to" | "templateName"
        >;

        const result = await sendRsvpTemplateMedia({
          to: job.phone,
          ...payload,
          templateName: job.templateName,
        });

        job.status = "sent";
        job.sentAt = new Date();
        job.wamid =
          result?.providerResponse?.messages?.[0]?.id || null;
        job.lastError = null;
        job.lockedAt = null;

        await job.save();
        sent++;

        /* ================= ROUND COMPLETION ================= */

        const remainingActive = await WhatsappQueue.countDocuments({
          invitationId: job.invitationId,
          templateName: job.templateName,
          status: { $in: ["pending", "sending", "scheduled"] }, // 🔥 גם scheduled
        });

        if (remainingActive === 0) {
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

        if (isRateLimitError(msg)) break;

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