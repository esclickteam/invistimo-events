import { NextRequest, NextResponse } from "next/server";
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

/**
 * פורמט תאריך ישראלי + שעה (אם קיימת)
 * דוגמה: 25.03.2026 15:00
 */
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

/**
 * מנקה כתובת של גוגל:
 * "חלוצי התעשייה 100, חיפה, 2620101, ישראל"
 * => "חלוצי התעשייה 100, חיפה"
 */
function cleanILAddress(address: unknown): string {
  const raw = typeof address === "string" ? address : "";
  if (!raw) return "";

  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  // מסירים "ישראל"
  const noIsrael = parts.filter((p) => p !== "ישראל");

  // מסירים מיקוד (רק ספרות, לרוב 5-7)
  const noZip = noIsrael.filter((p) => !/^\d{5,7}$/.test(p));

  // מחזירים "רחוב, עיר"
  if (noZip.length >= 2) return `${noZip[0]}, ${noZip[1]}`;

  return noZip.join(", ");
}

function pickEventLocation(invitation: any, event: any): string {
  const fromInvitation =
    cleanILAddress(invitation?.location?.address) ||
    (typeof invitation?.location?.name === "string"
      ? invitation.location.name.trim()
      : "");

  const fromEvent =
    cleanILAddress(event?.location?.address) ||
    (typeof event?.location?.name === "string" ? event.location.name.trim() : "");

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
       RSVP – QUEUE ONLY
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

      const invitation = await Invitation.findById(body.invitationId)
        .populate("eventId")
        .lean();

      if (!invitation || !invitation.eventId) {
        return NextResponse.json(
          { success: false, error: "INV_NOT_FOUND" },
          { status: 404 }
        );
      }

      const event = invitation.eventId as any;

      let round: 1 | 2;

      if (templateName === "rsvp_invitation_media") {
        round = 1;
        if (invitation.rsvpRound1SentAt) {
          return NextResponse.json(
            { success: false, error: "RSVP_ROUND1_ALREADY_SENT" },
            { status: 409 }
          );
        }
      } else {
        round = 2;
        if (!invitation.rsvpRound1SentAt) {
          return NextResponse.json(
            { success: false, error: "ROUND1_NOT_SENT_YET" },
            { status: 400 }
          );
        }
        if (invitation.rsvpRound2SentAt) {
          return NextResponse.json(
            { success: false, error: "RSVP_ROUND2_ALREADY_SENT" },
            { status: 409 }
          );
        }
      }

      const guests = await InvitationGuest.find({
        invitationId: invitation._id,
        _id: { $in: body.audience },
      }).lean();

      let queued = 0;

      // ✅ בונים פעם אחת – זהה לכל האורחים
      const dateValue =
        (invitation as any)?.eventDate ??
        (event as any)?.eventDate ??
        (event as any)?.date;

      const timeValue =
        (invitation as any)?.eventTime ?? (event as any)?.eventTime;

      const eventDateFormatted = formatEventDateTimeIL(dateValue, timeValue);
      const eventLocation = pickEventLocation(invitation, event);
      const eventTitle =
        (invitation as any)?.title?.trim?.() || (event as any)?.title || "האירוע";

      for (const guest of guests) {
        if (!guest.phone || !guest.token) continue;

        // 🔒 מניעת כפילויות
        const exists = await WhatsappQueue.findOne({
          invitationId: invitation._id,
          guestId: guest._id,
          templateName,
          status: { $in: ["pending", "sending", "sent"] },
        }).lean();

        if (exists) continue;

        const phone = guest.phone.startsWith("972")
          ? guest.phone
          : `972${guest.phone.replace(/^0/, "")}`;

        const rsvpLink = `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;

        await WhatsappQueue.create({
          invitationId: invitation._id,
          guestId: guest._id,
          phone,
          templateName,
          payload: {
            eventTitle,
            eventDate: eventDateFormatted,
            eventLocation,
            rsvpLink,
            headerImageUrl: invitation.headerImageUrl || invitation.previewImage,
            languageCode,
          },
        });

        queued++;
      }

      // מסמנים סבב – נכנס לתור
      await Invitation.updateOne(
        { _id: invitation._id },
        {
          $set:
            round === 1
              ? { rsvpRound1SentAt: new Date() }
              : { rsvpRound2SentAt: new Date() },
        }
      );

      return NextResponse.json({ success: true, queued, round }, { status: 200 });
    }

    /* =====================================================
       TABLE NUMBER – SEND IMMEDIATE
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
       THANK YOU – SEND IMMEDIATE
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