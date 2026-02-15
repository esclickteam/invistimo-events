import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";

import { sendRsvpTemplateMedia } from "@/lib/whatsapp/sendRsvpTemplateMedia";
import { sendTableNumberTemplate } from "@/lib/whatsapp/sendTableNumberTemplate";
import { sendThankYouTemplate } from "@/lib/whatsapp/sendThankYouTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= TYPES ================= */

type TemplateName =
  | "rsvp_invitation_media"
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
    value === "table_number_update_invistimo" ||
    value === "table_number_update_with_gift" ||
    value === "thank_you_message"
  );
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
       RSVP – BULK WHATSAPP
    ===================================================== */

    if (templateName === "rsvp_invitation_media") {
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

      // 🧠 קביעת סבב
      const totalGuestsCount = await InvitationGuest.countDocuments({
        invitationId: invitation._id,
      });

      const isRound1 = body.audience.length === totalGuestsCount;
      const isRound2 = body.audience.length < totalGuestsCount;

      // ⛔ חסימות
      if (isRound1 && invitation.rsvpRound1SentAt) {
        return NextResponse.json(
          {
            success: false,
            error: "RSVP_ROUND_1_ALREADY_SENT",
            sentAt: invitation.rsvpRound1SentAt,
          },
          { status: 409 }
        );
      }

      if (isRound2 && invitation.rsvpRound2SentAt) {
        return NextResponse.json(
          {
            success: false,
            error: "RSVP_ROUND_2_ALREADY_SENT",
            sentAt: invitation.rsvpRound2SentAt,
          },
          { status: 409 }
        );
      }

      const guests = await InvitationGuest.find({
        invitationId: invitation._id,
        _id: { $in: body.audience },
      }).lean();

      let sent = 0;

      for (const guest of guests) {
        if (!guest.phone || !guest.token) continue;

        const phone = guest.phone.startsWith("972")
          ? guest.phone
          : `972${guest.phone.replace(/^0/, "")}`;

        const rsvpLink = `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;

        await sendRsvpTemplateMedia({
          to: phone,
          eventTitle: event.title,
          eventDate: event.date,
          eventLocation:
            event.location?.address || event.location?.name || "",
          rsvpLink,
          headerImageUrl:
            invitation.headerImageUrl || invitation.previewImage,
          templateName,
          languageCode,
        });

        sent++;
      }

      // ✅ סימון הסבב שנשלח
      await Invitation.updateOne(
        { _id: invitation._id },
        {
          $set: isRound1
            ? { rsvpRound1SentAt: new Date() }
            : { rsvpRound2SentAt: new Date() },
        }
      );

      return NextResponse.json(
        { success: true, sent, round: isRound1 ? 1 : 2 },
        { status: 200 }
      );
    }

    /* =====================================================
       TABLE NUMBER
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
       THANK YOU
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
    console.error("❌ WHATSAPP SEND ERROR:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
