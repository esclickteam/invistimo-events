// app/api/whatsapp/send-template/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
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
  eventId?: string; // RSVP בלבד חייב
  to?: string;
  templateName?: TemplateName;
  languageCode?: string; // default: he

  // RSVP
  eventTitle?: string; // {{1}}
  eventDate?: string; // {{2}}
  eventLocation?: string; // {{3}}
  eventTime?: string; // {{4}}
  rsvpLink?: string; // {{5}}
  headerImageUrl?: string; // http(s) / data:image...

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

function isDataImageUri(value: string): boolean {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}

function isTemplateName(value: unknown): value is TemplateName {
  return (
    value === "rsvp_invitation_media" ||
    value === "table_number_update" ||
    value === "thank_you_message"
  );
}

/** נרמול תאריך: אם parseable -> פורמט he-IL, אחרת משאיר כמו שהוא */
function normalizeDateInput(v: unknown): string {
  const s = safeTrim(v);
  if (!s) return "";

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("he-IL");
  }

  return s;
}

/**
 * מושך תמונת preview מתוך canvasData במבנים שונים
 */
function extractPreviewImageFromCanvas(canvasData: unknown): string {
  try {
    if (!canvasData || typeof canvasData !== "object") return "";

    const data = canvasData as Record<string, unknown>;

    if (isNonEmptyString(data.previewImage)) return data.previewImage.trim();
    if (isNonEmptyString(data.imageUrl)) return data.imageUrl.trim();

    const objects = Array.isArray(data.objects) ? data.objects : [];
    const elements = Array.isArray(data.elements) ? data.elements : [];
    const items = [...objects, ...elements];

    const img = items.find((obj) => {
      if (!obj || typeof obj !== "object") return false;

      const rec = obj as Record<string, unknown>;
      const type = String(rec.type ?? "").toLowerCase();
      const url =
        typeof rec.url === "string"
          ? rec.url
          : typeof rec.src === "string"
          ? rec.src
          : "";

      return type === "image" && url.trim().length > 0;
    }) as Record<string, unknown> | undefined;

    if (!img) return "";

    const url =
      typeof img.url === "string"
        ? img.url
        : typeof img.src === "string"
        ? img.src
        : "";

    return url.trim();
  } catch {
    return "";
  }
}

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Missing Cloudinary env vars: CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET"
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

async function resolveHeaderImageUrl(
  rawValue: string,
  eventId: string
): Promise<{ finalUrl: string; uploaded: boolean }> {
  const value = rawValue.trim();
  if (!value) throw new Error("Missing header image value");

  if (isValidHttpUrl(value)) {
    return { finalUrl: value, uploaded: false };
  }

  if (isDataImageUri(value)) {
    configureCloudinary();

    const uploaded = await cloudinary.uploader.upload(value, {
      folder: "invistimo/whatsapp-headers",
      public_id: `event-${eventId}-${Date.now()}`,
      overwrite: false,
      resource_type: "image",
    });

    if (!uploaded?.secure_url) {
      throw new Error("Cloudinary upload failed: missing secure_url");
    }

    return { finalUrl: uploaded.secure_url, uploaded: true };
  }

  throw new Error("Unsupported image format for header image");
}

async function findInvitationByEventId(eventId: string) {
  // ניסיון 1: exact (string)
  let invitation = await Invitation.findOne({ eventId })
    .select("previewImage canvasData eventId")
    .lean();

  // ניסיון 2: ObjectId
  if (!invitation && mongoose.Types.ObjectId.isValid(eventId)) {
    invitation = await Invitation.findOne({
      eventId: new mongoose.Types.ObjectId(eventId),
    })
      .select("previewImage canvasData eventId")
      .lean();
  }

  return invitation as
    | {
        previewImage?: string;
        canvasData?: unknown;
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

  // eventId חובה רק ל-RSVP (כי יש fallback לתמונה מההזמנה)
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

    if (isNonEmptyString(body.headerImageUrl)) {
      const val = body.headerImageUrl.trim();
      if (!isValidHttpUrl(val) && !isDataImageUri(val)) {
        return "Invalid headerImageUrl";
      }
    }
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

    // 1) template + language
    const templateResult = resolveTemplateAndLang(body);
    if (!templateResult.ok) {
      return NextResponse.json(
        { success: false, error: templateResult.error },
        { status: 400 }
      );
    }

    const { templateName, languageCode } = templateResult;

    // 2) normalize fields לפני validation
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

    // 3) common validation (depends on template)
    const commonError = validateCommon(body, templateName);
    if (commonError) {
      return NextResponse.json(
        { success: false, error: commonError },
        { status: 400 }
      );
    }

    // 4) template-specific validation
    const templateError = validateByTemplate(body, templateName);
    if (templateError) {
      return NextResponse.json(
        { success: false, error: templateError },
        { status: 400 }
      );
    }

    await db();

    /* ---------- RSVP FLOW (with image) ---------- */
    if (templateName === "rsvp_invitation_media") {
      let rawHeaderImage = safeTrim(body.headerImageUrl);
      let invitationDoc: {
        previewImage?: string;
        canvasData?: unknown;
        eventId?: string | mongoose.Types.ObjectId;
      } | null = null;

      // fallback to invitation image only if no explicit headerImageUrl
      if (!rawHeaderImage) {
        invitationDoc = await findInvitationByEventId(body.eventId!);

        if (!invitationDoc) {
          return NextResponse.json(
            { success: false, error: "INVITATION_NOT_FOUND_FOR_EVENT" },
            { status: 404 }
          );
        }

        const fromPreview = isNonEmptyString(invitationDoc.previewImage)
          ? invitationDoc.previewImage.trim()
          : "";

        const fromCanvas = extractPreviewImageFromCanvas(invitationDoc.canvasData);

        rawHeaderImage = fromPreview || fromCanvas || "";
      }

      if (!rawHeaderImage) {
        return NextResponse.json(
          {
            success: false,
            error:
              "MISSING_INVITATION_IMAGE: No previewImage/canvas image found for this event",
          },
          { status: 400 }
        );
      }

      const { finalUrl, uploaded } = await resolveHeaderImageUrl(
        rawHeaderImage,
        body.eventId!
      );

      if (!isValidHttpUrl(finalUrl)) {
        return NextResponse.json(
          { success: false, error: "Invalid resolved header image URL" },
          { status: 400 }
        );
      }

      // if fallback used + image uploaded from data-uri => store public URL
      if (uploaded && !safeTrim(body.headerImageUrl)) {
        await Invitation.updateOne(
          { eventId: invitationDoc?.eventId ?? body.eventId },
          { $set: { previewImage: finalUrl } }
        );
      }

      const providerResponse = await sendRsvpTemplateMedia({
        to: body.to!,
        eventTitle: body.eventTitle!,
        eventDate: body.eventDate!,
        eventLocation: body.eventLocation!,
        eventTime: body.eventTime!,
        rsvpLink: body.rsvpLink!,
        headerImageUrl: finalUrl,
        templateName,
        languageCode,
      });

      return NextResponse.json(
        {
          success: true,
          templateName,
          languageCode,
          headerImageUrlUsed: finalUrl,
          imageUploadedToCloudinary: uploaded,
          providerResponse,
        },
        { status: 200 }
      );
    }

    /* ---------- TABLE FLOW ---------- */
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
        {
          success: true,
          templateName,
          languageCode,
          providerResponse,
        },
        { status: 200 }
      );
    }

    /* ---------- THANK-YOU FLOW ---------- */
    const providerResponse = await sendThankYouTemplate({
      to: body.to!,
      name: body.name!,
      templateName,
      languageCode,
    });

    return NextResponse.json(
      {
        success: true,
        templateName,
        languageCode,
        providerResponse,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    const isClientError =
      message.includes("Missing required field") ||
      message.includes("Invalid phone number") ||
      message.includes("Invalid rsvpLink") ||
      message.includes("Invalid headerImageUrl") ||
      message.includes("Invalid resolved header image URL") ||
      message.includes("Unsupported image format") ||
      message.includes("MISSING_INVITATION_IMAGE") ||
      message.includes("INVITATION_NOT_FOUND_FOR_EVENT") ||
      message.includes("Missing Cloudinary env vars") ||
      message.includes("Invalid JSON body") ||
      message.includes("WhatsApp template send failed (400)") ||
      message.toLowerCase().includes("template") ||
      message.toLowerCase().includes("parameter");

    return NextResponse.json(
      { success: false, error: message },
      { status: isClientError ? 400 : 500 }
    );
  }
}
