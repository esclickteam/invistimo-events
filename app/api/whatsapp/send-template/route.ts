import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import "@/models/Event";
import WhatsappQueue from "@/models/WhatsappQueue";

import { sendTableNumberTemplate } from "@/lib/whatsapp/sendTableNumberTemplate";
import { sendThankYouTemplate } from "@/lib/whatsapp/sendThankYouTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= TYPES ================= */

type TemplateName =
  | "rsvp_invitation_media"
  | "rsvp_reminder_invistimo"
  | "table_number_update_invistimo"
  | "table_number_update_with_gift"
  | "thank_you_message";

type SendTemplateRequestBody = {
  scheduledAt?: string;
  invitationId?: string;
  audience?: string[];
  to?: string;
  templateName?: TemplateName;
  languageCode?: string;
  name?: string;
  tableName?: string;
  eventType?: string;
  urlSuffix?: string;
  giftCreditUrl?: string;
};

/* ================= HELPERS ================= */

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function safeTrim(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isTemplateName(value: unknown): value is TemplateName {
  return (
    value === "rsvp_invitation_media" ||
    value === "rsvp_reminder_invistimo" ||
    value === "table_number_update_invistimo" ||
    value === "table_number_update_with_gift" ||
    value === "thank_you_message"
  );
}

/* ================= FORMAT DATE ================= */

function formatEventDateTime(
  dateString?: string,
  timeString?: string
): string {
  if (!dateString) return "";

  const date = new Date(dateString);

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  const formattedDate = `${dd}.${mm}.${yyyy}`;

  if (!timeString) return formattedDate;

  return `${formattedDate} ${timeString}`;
}

/* ================= CLEAN ADDRESS ================= */

function cleanAddress(address?: string): string {
  if (!address) return "";

  return address
    .replace(/,?\s*ישראל/gi, "")
    .replace(/\b\d{5,7}\b/g, "")
    .replace(/,+/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/,$/, "");
}

/* ================= TRANSACTION RETRY ================= */

async function runTransactionWithRetry<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>,
  retries = 3
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < retries; i++) {
    const session = await mongoose.startSession();

    try {
      let result!: T;

      await session.withTransaction(async () => {
        result = await fn(session);
      });

      session.endSession();
      return result;
    } catch (err: any) {
      session.endSession();
      lastError = err;

      if (
        err?.message?.includes("catalog changes") ||
        err?.errorLabels?.includes("TransientTransactionError")
      ) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

/* ================= ROUTE ================= */

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SendTemplateRequestBody>;
    const scheduledAt = body.scheduledAt;

    if (!isTemplateName(body.templateName)) {
      return NextResponse.json(
        { success: false, error: "INVALID_TEMPLATE" },
        { status: 400 }
      );
    }

    const templateName = body.templateName;
    const languageCode = safeTrim(body.languageCode) || "he";

    await db();

    /* ================= RSVP ================= */

    if (
      templateName === "rsvp_invitation_media" ||
      templateName === "rsvp_reminder_invistimo"
    ) {
      if (
        !isNonEmptyString(body.invitationId) ||
        !Array.isArray(body.audience) ||
        body.audience.length === 0
      ) {
        return NextResponse.json(
          { success: false, error: "MISSING_PARAMS" },
          { status: 400 }
        );
      }

      const result = await runTransactionWithRetry(async (session) => {
        const invitation = await Invitation.findById(body.invitationId)
          .populate("eventId")
          .session(session);

        if (!invitation || !invitation.eventId) {
          throw new Error("INV_NOT_FOUND");
        }

        const isRound1 = templateName === "rsvp_invitation_media";
        const isRound2 = templateName === "rsvp_reminder_invistimo";

        const round1Already =
  (
    invitation.rsvpRound1SentAt ||
    invitation.rsvpSmsRound1SentAt ||
    invitation.rsvpSmsRound1ScheduledAt ||
    invitation.rsvpWhatsappRound1ScheduledAt
  ) &&
  invitation.messageLocks?.rsvpWhatsappRound1;

const round2Already =
  (
    invitation.rsvpRound2SentAt ||
    invitation.rsvpSmsRound2SentAt ||
    invitation.rsvpSmsRound2ScheduledAt ||
    invitation.rsvpWhatsappRound2ScheduledAt
  ) &&
  invitation.messageLocks?.rsvpWhatsappRound2;

        if (isRound1 && round1Already) throw new Error("RSVP_ROUND1_ALREADY_SENT");
        if (isRound2 && !round1Already) throw new Error("ROUND2_NOT_ALLOWED_BEFORE_ROUND1");
        if (isRound2 && round2Already) throw new Error("RSVP_ROUND2_ALREADY_SENT");

        const guests = await InvitationGuest.find({
          invitationId: invitation._id,
          _id: { $in: body.audience },
        }).session(session);

        const queueDocs: any[] = [];

        for (const guest of guests) {
          if (!guest.phone || !guest.token) continue;

          const phone = guest.phone.startsWith("972")
            ? guest.phone
            : `972${guest.phone.replace(/^0/, "")}`;

          const round = isRound1 ? 1 : 2;

          queueDocs.push({
            invitationId: invitation._id,
            guestId: guest._id,
            phone,
            templateName,
            idempotencyKey: `${invitation._id}_${guest._id}_${templateName}_${round}_${Date.now()}`,
            payload: {
              rsvpLink: `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`,
              languageCode,
              eventTitle: invitation.title,
              eventDate: formatEventDateTime(invitation.eventDate, invitation.eventTime),
              eventLocation: cleanAddress(invitation.location?.address),
              headerImageUrl: invitation.headerImageUrl || "",
            },
            status: scheduledAt ? "scheduled" : "pending",
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          });
        }

        await WhatsappQueue.insertMany(queueDocs, { session });

        /* 🔥 תזמון */
        if (isRound1 && scheduledAt) {
          await Invitation.updateOne(
            { _id: invitation._id },
            { $set: { rsvpWhatsappRound1ScheduledAt: new Date(scheduledAt) } },
            { session }
          );
        }

        if (isRound2 && scheduledAt) {
          await Invitation.updateOne(
            { _id: invitation._id },
            { $set: { rsvpWhatsappRound2ScheduledAt: new Date(scheduledAt) } },
            { session }
          );
        }

        /* 🔥 מיידי */
        if (isRound1 && !scheduledAt) {
          await Invitation.updateOne(
            { _id: invitation._id, rsvpRound1SentAt: null },
            { $set: { rsvpRound1SentAt: new Date() } },
            { session }
          );
        }

        if (isRound2 && !scheduledAt) {
          await Invitation.updateOne(
            { _id: invitation._id, rsvpRound2SentAt: null },
            { $set: { rsvpRound2SentAt: new Date() } },
            { session }
          );
        }

        return { queued: queueDocs.length };
      });

      return NextResponse.json({ success: true, queued: result.queued });
    }

    return NextResponse.json(
      { success: false, error: "UNHANDLED_TEMPLATE" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("❌ WHATSAPP SEND ERROR:", error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || "SEND_FAILED" },
      { status: 500 }
    );
  }
}