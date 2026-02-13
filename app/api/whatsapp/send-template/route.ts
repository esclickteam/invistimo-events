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
  | "table_number_update"
  | "thank_you_message";

type SendTemplateRequestBody = {
  // common
  eventId?: string; // חובה ל-RSVP
  to?: string;
  templateName?: TemplateName;
  languageCode?: string; // default: he

  // RSVP (BODY)
  eventTitle?: string;     // {{1}}
  eventDate?: string;      // {{2}}
  eventLocation?: string;  // {{3}}
  eventTime?: string;      // {{4}}
  rsvpLink?: string;       // {{5}}

  // HEADER
  headerImageUrl?: string; // URL ציבורי (Cloudinary)

  // table / thank you
  name?: string;
  tableName?: string;
  eventType?: string;
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

function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function isTemplateName(value: unknown): value is TemplateName {
  return (
    value === "rsvp_invitation_media" ||
    value === "table_number_update" ||
    value === "thank_you_message"
  );
}

/** נרמול תאריך לתצוגה */
function normalizeDateInput(v: unknown): string {
  const s = safeTrim(v);
  if (!s) return "";

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("he-IL");
  }

  return s;
}

/* ================= DB HELPERS ================= */

async function findInvitationHeaderImage(eventId: string) {
  const query = mongoose.Types.ObjectId.isValid(eventId)
    ? { eventId: new mongoose.Types.ObjectId(eventId) }
    : { eventId };

  return (await Invitation.findOne(query)
    .select("headerImageUrl eventId")
    .lean()) as
    | {
        headerImageUrl?: string;
        eventId?: string | mongoose.Types.ObjectId;
      }
    | null;
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
    if (!isNonEmptyString(body.eventTime))
      return "Missing required field: eventTime";
    if (!isNonEmptyString(body.rsvpLink))
      return "Missing required field: rsvpLink";
  }

  if (templateName === "table_number_update") {
    if (!isNonEmptyString(body.name)) return "Missing required field: name";
    if (!isNonEmptyString(body.tableName))
      return "Missing required field: tableName";
    if (!isNonEmptyString(body.eventType))
      return "Missing required field: eventType";
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

    /* 1️⃣ Template + Language */
    const templateResult = resolveTemplateAndLang(body);
    if (!templateResult.ok) {
      return NextResponse.json(
        { success: false, error: templateResult.error },
        { status: 400 }
      );
    }

    const { templateName, languageCode } = templateResult;

    /* 2️⃣ Normalize */
    if (templateName === "rsvp_invitation_media") {
      body.eventTitle = safeTrim(body.eventTitle);
      body.eventDate = normalizeDateInput(body.eventDate);
      body.eventLocation = safeTrim(body.eventLocation);
      body.eventTime = safeTrim(body.eventTime);
      body.rsvpLink = safeTrim(body.rsvpLink);
      body.headerImageUrl = safeTrim(body.headerImageUrl);
      body.eventId = safeTrim(body.eventId);
      body.to = safeTrim(body.to);
    }

    if (templateName === "table_number_update") {
      body.name = safeTrim(body.name);
      body.tableName = safeTrim(body.tableName);
      body.eventType = safeTrim(body.eventType);
      body.to = safeTrim(body.to);
    }

    if (templateName === "thank_you_message") {
      body.name = safeTrim(body.name);
      body.to = safeTrim(body.to);
    }

    /* 3️⃣ Validation */
    const commonError = validateCommon(body, templateName);
    if (commonError) {
      return NextResponse.json(
        { success: false, error: commonError },
        { status: 400 }
      );
    }

    const templateError = validateByTemplate(body, templateName);
    if (templateError) {
      return NextResponse.json(
        { success: false, error: templateError },
        { status: 400 }
      );
    }

    await db();

    /* ================= RSVP ================= */
    if (templateName === "rsvp_invitation_media") {
      let headerImageUrl = body.headerImageUrl || "";

      // fallback רק לשדה headerImageUrl מה-DB
      if (!headerImageUrl) {
        const invitation = await findInvitationHeaderImage(body.eventId!);

        if (!invitation || !isNonEmptyString(invitation.headerImageUrl)) {
          return NextResponse.json(
            {
              success: false,
              error: "MISSING_HEADER_IMAGE_URL_FOR_EVENT",
            },
            { status: 400 }
          );
        }

        headerImageUrl = invitation.headerImageUrl.trim();
      }

      if (!isValidHttpUrl(headerImageUrl)) {
        return NextResponse.json(
          {
            success: false,
            error: "headerImageUrl must be a public https URL",
          },
          { status: 400 }
        );
      }

      const providerResponse = await sendRsvpTemplateMedia({
        to: body.to!,
        eventTitle: body.eventTitle!,
        eventDate: body.eventDate!,
        eventLocation: body.eventLocation!,
        eventTime: body.eventTime!,
        rsvpLink: body.rsvpLink!,
        headerImageUrl,
        templateName,
        languageCode,
      });

      return NextResponse.json(
        {
          success: true,
          templateName,
          languageCode,
          headerImageUrlUsed: headerImageUrl,
          providerResponse,
        },
        { status: 200 }
      );
    }

    /* ================= TABLE ================= */
    if (templateName === "table_number_update") {
      const providerResponse = await sendTableNumberTemplate({
        to: body.to!,
        name: body.name!,
        tableName: body.tableName!,
        eventType: body.eventType!,
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
