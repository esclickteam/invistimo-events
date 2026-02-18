import { NextResponse } from "next/server";
import db from "@/lib/db";
import WhatsappQueue from "@/models/WhatsappQueue";

import { sendRsvpTemplateMedia } from "@/lib/whatsapp/sendRsvpTemplateMedia";
import { sendTableNumberTemplate } from "@/lib/whatsapp/sendTableNumberTemplate";
import { sendThankYouTemplate } from "@/lib/whatsapp/sendThankYouTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= CONFIG ================= */

const MAX_PER_RUN = 80;      // כמה הודעות בכל ריצה
const DELAY_BETWEEN = 800;  // השהיה בין הודעות (ms)

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ================= ROUTE ================= */

export async function GET() {
  await db();

  const jobs = await WhatsappQueue.find({
    status: "pending",
  })
    .sort({ createdAt: 1 })
    .limit(MAX_PER_RUN);

  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      // 🔒 נועל את המשימה
      job.status = "sending";
      await job.save();

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
      if (
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
      if (templateName === "thank_you_message") {
        result = await sendThankYouTemplate({
          to: phone,
          ...payload,
          templateName,
        });
      }

      // ✅ WhatsApp קיבל – אבל עדיין לא delivered
      job.status = "sent";
      job.sentAt = new Date();
      job.wamid = result?.providerResponse?.messages?.[0]?.id || null;
      await job.save();

      sent++;
      await sleep(DELAY_BETWEEN);
    } catch (err: any) {
      const msg = String(err?.message || "");

      job.status = "failed";
      job.attempts += 1;
      job.lastError = msg;
      await job.save();

      failed++;

      // 🚨 חסימת WhatsApp – עוצרים מייד
      if (msg.includes("131048") || msg.toLowerCase().includes("rate")) {
        console.warn("⛔ WhatsApp rate limit detected – stopping cron");
        break;
      }
    }
  }

  return NextResponse.json({
    success: true,
    processed: jobs.length,
    sent,
    failed,
  });
}
