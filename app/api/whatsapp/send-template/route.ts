// app/api/whatsapp/send-template/route.ts
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { sendRsvpTemplateMedia } from "@/lib/whatsapp/sendRsvpTemplateMedia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SendTemplateRequestBody = {
  eventId: string;
  to: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventTime: string;
  rsvpLink: string;
  headerImageUrl?: string;
  templateName?: string;
  languageCode?: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
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

function extractPreviewImageFromCanvas(canvasData: any): string {
  try {
    if (!canvasData || typeof canvasData !== "object") return "";

    if (isNonEmptyString(canvasData.previewImage)) return canvasData.previewImage.trim();
    if (isNonEmptyString(canvasData.imageUrl)) return canvasData.imageUrl.trim();

    const items: any[] = [
      ...(Array.isArray(canvasData.objects) ? canvasData.objects : []),
      ...(Array.isArray(canvasData.elements) ? canvasData.elements : []),
    ];

    const img = items.find((obj) => {
      if (!obj || typeof obj !== "object") return false;
      const type = String(obj.type || "").toLowerCase();
      const url =
        typeof obj.url === "string"
          ? obj.url
          : typeof obj.src === "string"
          ? obj.src
          : "";
      return type === "image" && url.trim().length > 0;
    });

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

function validateBody(body: Partial<SendTemplateRequestBody>): string | null {
  if (!isNonEmptyString(body.eventId)) return "Missing required field: eventId";
  if (!isNonEmptyString(body.to)) return "Missing required field: to";
  if (!isNonEmptyString(body.eventTitle)) return "Missing required field: eventTitle";
  if (!isNonEmptyString(body.eventDate)) return "Missing required field: eventDate";
  if (!isNonEmptyString(body.eventLocation)) return "Missing required field: eventLocation";
  if (!isNonEmptyString(body.eventTime)) return "Missing required field: eventTime";
  if (!isNonEmptyString(body.rsvpLink)) return "Missing required field: rsvpLink";

  if (isNonEmptyString(body.headerImageUrl)) {
    const val = body.headerImageUrl.trim();
    if (!isValidHttpUrl(val) && !isDataImageUri(val)) {
      return "Invalid headerImageUrl";
    }
  }

  return null;
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
  // ניסיון 1: exact
  let invitation = await Invitation.findOne({ eventId })
    .select("previewImage canvasData eventId")
    .lean();

  // ניסיון 2: אם eventId נראה ObjectId
  if (!invitation && mongoose.Types.ObjectId.isValid(eventId)) {
    invitation = await Invitation.findOne({
      eventId: new mongoose.Types.ObjectId(eventId),
    })
      .select("previewImage canvasData eventId")
      .lean();
  }

  return invitation;
}

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

    const validationError = validateBody(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    await db();

    let rawHeaderImage = body.headerImageUrl?.trim() || "";
    let invitationDoc: any = null;

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

    // נשמור URL ציבורי במקום base64 כדי לחסוך העלאות חוזרות
    if (uploaded && !body.headerImageUrl) {
      await Invitation.updateOne(
        { eventId: invitationDoc?.eventId ?? body.eventId },
        { $set: { previewImage: finalUrl } }
      );
    }

    const result = await sendRsvpTemplateMedia({
      to: body.to!,
      eventTitle: body.eventTitle!,
      eventDate: body.eventDate!,
      eventLocation: body.eventLocation!,
      eventTime: body.eventTime!,
      rsvpLink: body.rsvpLink!,
      headerImageUrl: finalUrl,
      templateName: body.templateName,
      languageCode: body.languageCode,
    });

    return NextResponse.json(
      {
        success: true,
        headerImageUrlUsed: finalUrl,
        imageUploadedToCloudinary: uploaded,
        providerResponse: result,
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
      message.includes("Missing Cloudinary env vars");

    return NextResponse.json(
      { success: false, error: message },
      { status: isClientError ? 400 : 500 }
    );
  }
}
