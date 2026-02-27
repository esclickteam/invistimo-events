import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import WhatsappQueue from "@/models/WhatsappQueue";

import { sendRsvpTemplateMedia } from "@/lib/whatsapp/sendRsvpTemplateMedia";
import { sendTableNumberTemplate } from "@/lib/whatsapp/sendTableNumberTemplate";
import { sendThankYouTemplate } from "@/lib/whatsapp/sendThankYouTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= CONFIG (Vercel Cron Safe) ================= */

const MAX_PER_RUN = 30; // ✅ מומלץ ל-Vercel Cron
const DELAY_BETWEEN = 1200; // ✅ קצב שמרני יותר
const JITTER_MAX = 250; // ✅ רנדומליות קטנה כדי לא ליצור תבנית קבועה
const STUCK_SENDING_AFTER_MS = 10 * 60 * 1000; // ✅ 10 דקות
const MAX_ATTEMPTS = 3; // ✅ כמה פעמים לנסות לפני failed סופי

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
    // ✅ הגנה בסיסית (מומלץ)
    // להוסיף ב-Vercel env: CRON_SECRET ולשלוח אותו כ-?token=...
    const token = new URL(req.url).searchParams.get("token");
    const secret = process.env.CRON_SECRET;
    if (secret && token !== secret) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    await db();

    // ✅ Recovery: מחזירים עבודות "sending" תקועות ל-pending
    await WhatsappQueue.updateMany(
      {
        status: "sending",
        lockedAt: { $lt: nowMinus(STUCK_SENDING_AFTER_MS) },
      },
      {
        $set: { status: "pending" },
        $inc: { attempts: 1 },
        $setOnInsert: {},
      }
    );

    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < MAX_PER_RUN; i++) {
      // ✅ Atomic lock: משיכה של עבודה אחת בלבד בנעילה אטומית
      const job = await WhatsappQueue.findOneAndUpdate(
        {
          status: "pending",
          attempts: { $lt: MAX_ATTEMPTS },
        },
        {
          $set: { status: "sending", lockedAt: new Date() },
        },
        {
          sort: { createdAt: 1 },
          new: true,
        }
      );

      if (!job) break; // אין עוד עבודות

      processed++;

      try {
        const { templateName, phone, payload } = job;

        let result: any = null;

        /* ===== RSVP ===== */
        if (
          templateName === "rsvp_invitation_media" ||
          templateName === "rsvp_reminder_invistimo"
        ) {
          result = await sendRsvpTemplateMedia({
            to: phone,
            ...payload,
            templateName,
          });
        }

        /* ===== TABLE NUMBER ===== */
        else if (
          templateName === "table_number_update_invistimo" ||
          templateName === "table_number_update_with_gift"
        ) {
          result = await sendTableNumberTemplate({
            to: phone,
            ...payload,
            templateName,
          });
        }

        /* ===== THANK YOU ===== */
        else if (templateName === "thank_you_message") {
          result = await sendThankYouTemplate({
            to: phone,
            ...payload,
            templateName,
          });
        } else {
          throw new Error(`UNSUPPORTED_TEMPLATE: ${templateName}`);
        }

        // ✅ WhatsApp קיבל (accepted) – עדיין לא delivered (זה יגיע מה-webhook)
        job.status = "sent";
        job.sentAt = new Date();
        job.wamid = result?.providerResponse?.messages?.[0]?.id || null;
        job.lastError = undefined;

        await job.save();

        sent++;

        // ✅ Delay + jitter
        const jitter = Math.floor(Math.random() * JITTER_MAX);
        await sleep(DELAY_BETWEEN + jitter);
      } catch (err: any) {
        const msg = String(err?.message || err);

        job.attempts = (job.attempts ?? 0) + 1;
        job.lastError = msg;

        // אם עברנו מקס ניסיונות — נכשל סופית
        if (job.attempts >= MAX_ATTEMPTS) {
          job.status = "failed";
          failed++;
        } else {
          // נחזיר ל-pending כדי לנסות שוב בריצה הבאה
          job.status = "pending";
        }

        // משחררים נעילה
        job.lockedAt = undefined;

        await job.save();

        // 🚨 Rate limit — עוצרים מייד כדי לא להחמיר את החסימה
        if (isRateLimitError(msg)) {
          console.warn("⛔ WhatsApp rate limit detected – stopping cron", msg);
          break;
        }

        // בלי delay ארוך מדי על שגיאות — אבל קצת breathing room
        await sleep(400);
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      sent,
      failed,
      maxPerRun: MAX_PER_RUN,
      delayBetween: DELAY_BETWEEN,
    });
  } catch (err: any) {
    console.error("❌ WHATSAPP CRON ERROR:", err);
    return NextResponse.json(
      { success: false, error: "CRON_FAILED", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}