import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";

import { sendRsvpTemplateMedia } from "@/lib/whatsapp/sendRsvpTemplateMedia";
import { sendTableNumberTemplate } from "@/lib/whatsapp/sendTableNumberTemplate";
import { sendThankYouTemplate } from "@/lib/whatsapp/sendThankYouTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= TYPES ================= */

type TemplateName =
  | "rsvp_invitation_media"
  | "table_number_update_invistimo"
  | "table_number_update_with_gift" // ✅ חדש
  | "thank_you_message";

type SendTemplateRequestBody = {
  eventId?: string;
  to?: string;
  templateName?: TemplateName;
  languageCode?: string;

  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  rsvpLink?: string;

  headerImageUrl?: string;

  name?: string;
  tableName?: string;
  eventType?: string;
  urlSuffix?: string;

  giftCreditUrl?: string; // ✅ חדש
};

type ClientValidationResult =
  | { ok: true; templateName: TemplateName; languageCode: string }
  | { ok: false; error: string };

/* ================= HELPERS ================= */

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function safeTrim(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isValidHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

function isTemplateName(value: unknown): value is TemplateName {
  return (
    value === "rsvp_invitation_media" ||
    value === "table_number_update_invistimo" ||
    value === "table_number_update_with_gift" || // ✅ חדש
    value === "thank_you_message"
  );
}

function normalizeDateInput(v: unknown): string {
  const s = safeTrim(v);
  if (!s) return "";
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("he-IL");
  }
  return s;
}

/* ================= VALIDATION ================= */

function validateCommon(
  body: Partial<SendTemplateRequestBody>,
  templateName: TemplateName
): string | null {
  if (!isNonEmptyString(body.to)) return "Missing required field: to";

  if (
    templateName === "rsvp_invitation_media" &&
    !isNonEmptyString(body.eventId)
  ) {
    return "Missing required field: eventId";
  }

  if (
    templateName === "table_number_update_with_gift" &&
    !isNonEmptyString(body.eventId)
  ) {
    return "Missing required field: eventId";
  }

  return null;
}

function validateByTemplate(
  body: Partial<SendTemplateRequestBody>,
  templateName: TemplateName
): string | null {
  if (templateName === "rsvp_invitation_media") {
    if (!isNonEmptyString(body.eventTitle))
      return "Missing required field: eventTitle";
    if (!isNonEmptyString(body.eventDate))
      return "Missing required field: eventDate";
    if (!isNonEmptyString(body.eventLocation))
      return "Missing required field: eventLocation";
    if (!isNonEmptyString(body.rsvpLink))
      return "Missing required field: rsvpLink";
  }

  if (
    templateName === "table_number_update_invistimo" ||
    templateName === "table_number_update_with_gift"
  ) {
    if (!isNonEmptyString(body.name)) return "Missing required field: name";
    if (!isNonEmptyString(body.tableName))
      return "Missing required field: tableName";
    if (!isNonEmptyString(body.eventType))
      return "Missing required field: eventType";
    if (!isNonEmptyString(body.urlSuffix))
      return "Missing required field: urlSuffix";
  }

  if (templateName === "thank_you_message") {
    if (!isNonEmptyString(body.name)) return "Missing required field: name";
  }

  return null;
}

function resolveTemplateAndLang(
  body: Partial<SendTemplateRequestBody>
): ClientValidationResult {
  if (!isTemplateName(body.templateName)) {
    return { ok: false, error: "Missing or invalid templateName" };
  }

  const languageCode = safeTrim(body.languageCode) || "he";
  return { ok: true, templateName: body.templateName, languageCode };
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

    const templateResult = resolveTemplateAndLang(body);
    if (!templateResult.ok) {
      return NextResponse.json(
        { success: false, error: templateResult.error },
        { status: 400 }
      );
    }

    const { templateName, languageCode } = templateResult;

    body.to = safeTrim(body.to);
    body.eventId = safeTrim(body.eventId);
    body.name = safeTrim(body.name);
    body.tableName = safeTrim(body.tableName);
    body.eventType = safeTrim(body.eventType);
    body.urlSuffix = safeTrim(body.urlSuffix);
    body.giftCreditUrl = safeTrim(body.giftCreditUrl);

    const commonError = validateCommon(body, templateName);
    if (commonError)
      return NextResponse.json({ success: false, error: commonError }, { status: 400 });

    const templateError = validateByTemplate(body, templateName);
    if (templateError)
      return NextResponse.json({ success: false, error: templateError }, { status: 400 });

    await db();

    /* ================= TABLE WITH GIFT ================= */
    if (templateName === "table_number_update_with_gift") {
      let giftUrl = body.giftCreditUrl || "";

      if (!giftUrl && body.eventId) {
        const invitation = await Invitation.findOne({
          eventId: new mongoose.Types.ObjectId(body.eventId),
        })
          .select("giftCreditUrl")
          .lean();

        if (invitation?.giftCreditUrl) {
          giftUrl = invitation.giftCreditUrl.trim();
        }
      }

      const providerResponse = await sendTableNumberTemplate({
        to: body.to!,
        name: body.name!,
        tableName: body.tableName!,
        eventType: body.eventType!,
        urlSuffix: body.urlSuffix!,
        giftCreditUrl: giftUrl, // ✅ מועבר לפונקציה
        templateName,
        languageCode,
      });

      return NextResponse.json(
        { success: true, templateName, languageCode, providerResponse },
        { status: 200 }
      );
    }

    /* ================= TABLE רגיל ================= */
    if (templateName === "table_number_update_invistimo") {
      const providerResponse = await sendTableNumberTemplate({
        to: body.to!,
        name: body.name!,
        tableName: body.tableName!,
        eventType: body.eventType!,
        urlSuffix: body.urlSuffix!,
        templateName,
        languageCode,
      });

      return NextResponse.json(
        { success: true, templateName, languageCode, providerResponse },
        { status: 200 }
      );
    }

    /* ================= THANK YOU ================= */
    const providerResponse = await sendThankYouTemplate({
      to: body.to!,
      name: body.name!,
      templateName,
      languageCode,
    });

    return NextResponse.json(
      { success: true, templateName, languageCode, providerResponse },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
