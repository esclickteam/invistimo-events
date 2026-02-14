import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
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
  // RSVP (bulk)
  invitationId?: string;
  audience?: string[];

  // single-recipient templates
  to?: string;

  templateName?: TemplateName;
  languageCode?: string;

  // RSVP fields
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  rsvpLink?: string;
  headerImageUrl?: string;

  // table / thank you
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
    let body: Partial<SendTemplateRequestBody>;

    try {
      body = (await req.json()) as Partial<SendTemplateRequestBody>;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!isTemplateName(body.templateName)) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid templateName" },
        { status: 400 }
      );
    }

    const templateName = body.templateName;
    const languageCode = safeTrim(body.languageCode) || "he";

    await db();

    /* =====================================================
       RSVP – BULK WHATSAPP (NO `to` FROM CLIENT)
    ===================================================== */

    if (templateName === "rsvp_invitation_media") {
      if (
        !isNonEmptyString(body.invitationId) ||
        !Array.isArray(body.audience) ||
        body.audience.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing invitationId or audience",
          },
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

        const rsvpLink = `${process.env.NEXT_PUBLIC_APP_URL}/rsvp/${guest.token}`;

        await sendRsvpTemplateMedia({
          to: phone,
          eventTitle: event.title,
          eventDate: event.date,
          eventLocation:
            event.location?.address || event.location?.name || "",
          rsvpLink,
          headerImageUrl:
            invitation.previewImage || invitation.headerImageUrl,
          templateName,
          languageCode,
        });

        sent++;
      }

      return NextResponse.json(
        { success: true, sent },
        { status: 200 }
      );
    }

    /* =====================================================
       TABLE NUMBER (WITH / WITHOUT GIFT)
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
          { success: false, error: "Missing required table fields" },
          { status: 400 }
        );
      }

      let giftUrl = safeTrim(body.giftCreditUrl);

      if (
        templateName === "table_number_update_with_gift" &&
        !giftUrl &&
        isNonEmptyString(body.invitationId)
      ) {
        const invitation = await Invitation.findById(body.invitationId)
          .select("giftCreditUrl")
          .lean();

        if (invitation?.giftCreditUrl) {
          giftUrl = invitation.giftCreditUrl.trim();
        }
      }

      const providerResponse = await sendTableNumberTemplate({
        to: body.to,
        name: body.name,
        tableName: body.tableName,
        eventType: body.eventType,
        urlSuffix: body.urlSuffix,
        giftCreditUrl: giftUrl || undefined,
        templateName,
        languageCode,
      });

      return NextResponse.json(
        { success: true, providerResponse },
        { status: 200 }
      );
    }

    /* =====================================================
       THANK YOU
    ===================================================== */

    if (templateName === "thank_you_message") {
      if (!isNonEmptyString(body.to) || !isNonEmptyString(body.name)) {
        return NextResponse.json(
          { success: false, error: "Missing required fields" },
          { status: 400 }
        );
      }

      const providerResponse = await sendThankYouTemplate({
        to: body.to,
        name: body.name,
        templateName,
        languageCode,
      });

      return NextResponse.json(
        { success: true, providerResponse },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, error: "UNHANDLED_TEMPLATE" },
      { status: 400 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    console.error("❌ WHATSAPP SEND ERROR:", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
