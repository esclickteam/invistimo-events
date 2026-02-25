import { NextResponse } from "next/server";
import db from "@/lib/db";
import WhatsappQueue from "@/models/WhatsappQueue";

import { sendRsvpTemplateMedia } from "@/lib/whatsapp/sendRsvpTemplateMedia";
import { sendTableNumberTemplate } from "@/lib/whatsapp/sendTableNumberTemplate";
import { sendThankYouTemplate } from "@/lib/whatsapp/sendThankYouTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= CONFIG ================= */

const MAX_PER_RUN = 80;
const DELAY_BETWEEN = 800;

const sleep = (ms: number) =>
  new Promise((r) => setTimeout(r, ms));

/* ================= ROUTE ================= */

export async function GET() {
  await db();

  const jobs = await WhatsappQueue.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .limit(MAX_PER_RUN);

  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    // 🔒 נעילה אטומית
    const locked = await WhatsappQueue.findOneAndUpdate(
      { _id: job._id, status: "pending" },
      { status: "sending" },
      { new: true }
    );

    if (!locked) continue;

    try {
      const { templateName, phone, payload } = locked;

      let result: any = null;

      /* ===== RSVP ===== */
      if (
        templateName === "rsvp_invitation_media" ||
        templateName === "rsvp_reminder_invistimo"
      ) {
        result = await sendRsvpTemplateMedia({
          to: phone,
          templateName,
          ...(payload as {
            eventTitle: string;
            eventDate: string;
            eventLocation: string;
            rsvpLink: string;
            headerImageUrl: string;
          }),
        });
      }

      /* ===== TABLE NUMBER ===== */
else if (
  templateName === "table_number_update_invistimo" ||
  templateName === "table_number_update_with_gift"
) {
  const tablePayload = payload as {
    name: string;
    tableName: string;
    eventType: string;
    urlSuffix?: string;
  };

  result = await sendTableNumberTemplate({
    to: phone,
    templateName,
    name: tablePayload.name,
    tableName: tablePayload.tableName,
    eventType: tablePayload.eventType,
    urlSuffix: tablePayload.urlSuffix ?? "",
  });
}

      /* ===== THANK YOU ===== */
      else if (templateName === "thank_you_message") {
        result = await sendThankYouTemplate({
          to: phone,
          templateName,
          ...(payload as {
            name: string;
          }),
        });
      } else {
        throw new Error(`Unknown templateName: ${templateName}`);
      }

      // ✅ הצלחה
      locked.status = "sent";
      locked.sentAt = new Date();
      locked.wamid =
        result?.providerResponse?.messages?.[0]?.id ?? null;

      await locked.save();
      sent++;

      await sleep(DELAY_BETWEEN);
    } catch (err: any) {
      const msg = String(err?.message || err);

      locked.status = "failed";
      locked.attempts += 1;
      locked.lastError = msg;

      await locked.save();
      failed++;

      if (
        msg.includes("131048") ||
        msg.toLowerCase().includes("rate")
      ) {
        console.warn("⛔ WhatsApp rate limit – stopping cron");
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