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

function formatEventDateTimeIL(dateValue: any, timeValue?: any): string {
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(d.getTime())) return "";

  const dateStr = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);

  const t = typeof timeValue === "string" ? timeValue.trim() : "";
  return t ? `${dateStr} ${t}` : dateStr;
}

function cleanILAddress(address: unknown): string {
  const raw = typeof address === "string" ? address : "";
  if (!raw) return "";

  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => p !== "ישראל")
    .filter((p) => !/^\d{5,7}$/.test(p));

  if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
  return parts.join(", ");
}

function pickEventLocation(invitation: any, event: any): string {
  const fromInvitation =
    cleanILAddress(invitation?.location?.address) ||
    invitation?.location?.name?.trim?.();

  const fromEvent =
    cleanILAddress(event?.location?.address) ||
    event?.location?.name?.trim?.();

  return fromInvitation || fromEvent || "מיקום יישלח בהמשך";
}

/* ================= ROUTE ================= */

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SendTemplateRequestBody>;

    if (!isTemplateName(body.templateName)) {
      return NextResponse.json(
        { success: false, error: "INVALID_TEMPLATE" },
        { status: 400 }
      );
    }

    const templateName = body.templateName;
    const languageCode = safeTrim(body.languageCode) || "he";

    await db();

    /* =====================================================
       RSVP – ATOMIC QUEUE
    ===================================================== */

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

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const invitation = await Invitation.findById(body.invitationId)
          .populate("eventId")
          .session(session);

        if (!invitation || !invitation.eventId) {
          throw new Error("INV_NOT_FOUND");
        }

        const event = invitation.eventId as any;

        let round: 1 | 2;

        if (templateName === "rsvp_invitation_media") {
          round = 1;
          if (invitation.rsvpRound1SentAt) {
            throw new Error("RSVP_ROUND1_ALREADY_SENT");
          }
        } else {
          round = 2;
          if (!invitation.rsvpRound1SentAt) {
            throw new Error("ROUND1_NOT_SENT_YET");
          }
          if (invitation.rsvpRound2SentAt) {
            throw new Error("RSVP_ROUND2_ALREADY_SENT");
          }
        }

        const guests = await InvitationGuest.find({
          invitationId: invitation._id,
          _id: { $in: body.audience },
        }).session(session);

        const dateValue =
          invitation?.eventDate ??
          event?.eventDate ??
          event?.date;

        const timeValue =
          invitation?.eventTime ?? event?.eventTime;

        const eventDateFormatted = formatEventDateTimeIL(dateValue, timeValue);
        const eventLocation = pickEventLocation(invitation, event);
        const eventTitle =
          invitation?.title?.trim?.() || event?.title || "האירוע";

        const queueDocs: any[] = [];

        for (const guest of guests) {
          if (!guest.phone || !guest.token) continue;

          const exists = await WhatsappQueue.findOne({
            invitationId: invitation._id,
            guestId: guest._id,
            templateName,
            status: { $in: ["pending", "sending", "sent"] },
          }).session(session);

          if (exists) continue;

          const phone = guest.phone.startsWith("972")
            ? guest.phone
            : `972${guest.phone.replace(/^0/, "")}`;

          const rsvpLink = `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;

          const idempotencyKey = `${invitation._id}_${guest._id}_${templateName}_${round}`;

          queueDocs.push({
            invitationId: invitation._id,
            guestId: guest._id,
            phone,
            templateName,
            idempotencyKey,
            payload: {
              eventTitle,
              eventDate: eventDateFormatted,
              eventLocation,
              rsvpLink,
              headerImageUrl:
                invitation.headerImageUrl || invitation.previewImage,
              languageCode,
            },
            status: "pending",
          });
        }

        if (queueDocs.length === 0) {
          throw new Error("NO_VALID_GUESTS");
        }

        await WhatsappQueue.insertMany(queueDocs, { session });

        if (round === 1) {
          invitation.rsvpRound1SentAt = new Date();
        } else {
          invitation.rsvpRound2SentAt = new Date();
        }

        await invitation.save({ session });

        await session.commitTransaction();
        session.endSession();

        return NextResponse.json(
          { success: true, queued: queueDocs.length, round },
          { status: 200 }
        );
      } catch (err: any) {
        await session.abortTransaction();
        session.endSession();

        return NextResponse.json(
          { success: false, error: err.message || "RSVP_QUEUE_FAILED" },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       TABLE NUMBER – IMMEDIATE
    ===================================================== */

    if (
      templateName === "table_number_update_invistimo" ||
      templateName === "table_number_update_with_gift"
    ) {
      if (
        !isNonEmptyString(body.to) ||
        !isNonEmptyString(body.name) ||
        !isNonEmptyString(body.tableName) ||
        !isNonEmptyString(body.eventType) ||
        !isNonEmptyString(body.urlSuffix)
      ) {
        return NextResponse.json(
          { success: false, error: "MISSING_TABLE_FIELDS" },
          { status: 400 }
        );
      }

      const providerResponse = await sendTableNumberTemplate({
        to: body.to,
        name: body.name,
        tableName: body.tableName,
        eventType: body.eventType,
        urlSuffix: body.urlSuffix,
        giftCreditUrl: body.giftCreditUrl,
        templateName,
        languageCode,
      });

      return NextResponse.json({ success: true, providerResponse });
    }

    /* =====================================================
       THANK YOU – IMMEDIATE
    ===================================================== */

    if (templateName === "thank_you_message") {
      if (!isNonEmptyString(body.to) || !isNonEmptyString(body.name)) {
        return NextResponse.json(
          { success: false, error: "MISSING_FIELDS" },
          { status: 400 }
        );
      }

      const providerResponse = await sendThankYouTemplate({
        to: body.to,
        name: body.name,
        templateName,
        languageCode,
      });

      return NextResponse.json({ success: true, providerResponse });
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