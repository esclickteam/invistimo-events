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
const DELAY_BETWEEN = 800;  // השהיה בין הודעות

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ================= ROUTE ================= */

export async function GET() {
  await db();

  // מושכים הודעות ממתינות
  const jobs = await WhatsappQueue.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .limit(MAX_PER_RUN);

  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      // מסמנים כ־sending כדי שלא יישלח פעמיים
      job.status = "sending";
      await job.save();

      const { templateName, phone, payload } = job;

      /* ===== שליחה לפי סוג תבנית ===== */

      if (
        templateName === "rsvp_invitation_media" ||
        templateName === "rsvp_reminder_invistimo"
      ) {
        await sendRsvpTemplateMedia({
          to: phone,
          ...payload,
          templateName,
        });
      }

      if (
        templateName === "table_number_update_invistimo" ||
        templateName === "table_number_update_with_gift"
      ) {
        await sendTableNumberTemplate({
          to: phone,
          ...payload,
          templateName,
        });
      }

      if (templateName === "thank_you_message") {
        await sendThankYouTemplate({
          to: phone,
          ...payload,
          templateName,
        });
      }

      job.status = "sent";
      job.sentAt = new Date();
      await job.save();

      sent++;
      await sleep(DELAY_BETWEEN);
    } catch (err: any) {
      job.status = "failed";
      job.attempts += 1;
      job.lastError = err?.message || "SEND_FAILED";
      await job.save();

      failed++;

      // 🚨 אם WhatsApp חסם – עוצרים מייד
      const msg = String(err?.message || "");
      if (msg.includes("131048") || msg.includes("rate")) {
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
