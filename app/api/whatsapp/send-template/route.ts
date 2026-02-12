// app/api/whatsapp/send-template/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { sendRsvpTemplateMedia } from "@/lib/whatsapp/sendRsvpTemplateMedia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SendTemplateRequestBody = {
  eventId: string;         // ✅ חובה - כדי למשוך תמונה מההזמנה
  to: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventTime: string;
  rsvpLink: string;
  // headerImageUrl אופציונלי בלבד (override ידני אם רוצים)
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

/**
 * חילוץ תמונת פריוויו מתוך canvasData
 * תומך במבנים נפוצים:
 * - canvasData.objects
 * - canvasData.elements
 * - canvasData.previewImage / canvasData.imageUrl
 */
function extractPreviewImageFromCanvas(canvasData: any): string {
  try {
    if (!canvasData || typeof canvasData !== "object") return "";

    if (isNonEmptyString(canvasData.previewImage)) {
      return canvasData.previewImage.trim();
    }

    if (isNonEmptyString(canvasData.imageUrl)) {
      return canvasData.imageUrl.trim();
    }

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

  if (isNonEmptyString(body.headerImageUrl) && !isValidHttpUrl(body.headerImageUrl.trim())) {
    return "Invalid headerImageUrl";
  }

  return null;
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

    // 1) אם נשלח headerImageUrl מפורש - נשתמש בו
    // 2) אחרת נמשוך מהזמנה לפי eventId
    let resolvedHeaderImageUrl = body.headerImageUrl?.trim() || "";

    if (!resolvedHeaderImageUrl) {
      const invitation = await Invitation.findOne({ eventId: body.eventId })
        .select("previewImage canvasData")
        .lean();

      if (!invitation) {
        return NextResponse.json(
          { success: false, error: "INVITATION_NOT_FOUND_FOR_EVENT" },
          { status: 404 }
        );
      }

      const fromPreview = isNonEmptyString((invitation as any).previewImage)
        ? (invitation as any).previewImage.trim()
        : "";

      const fromCanvas = extractPreviewImageFromCanvas((invitation as any).canvasData);

      resolvedHeaderImageUrl = fromPreview || fromCanvas || "";
    }

    if (!resolvedHeaderImageUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "MISSING_INVITATION_IMAGE: No previewImage/canvas image found for this event",
        },
        { status: 400 }
      );
    }

    if (!isValidHttpUrl(resolvedHeaderImageUrl)) {
      return NextResponse.json(
        { success: false, error: "Invalid resolved header image URL" },
        { status: 400 }
      );
    }

    const result = await sendRsvpTemplateMedia({
      to: body.to!,
      eventTitle: body.eventTitle!,
      eventDate: body.eventDate!,
      eventLocation: body.eventLocation!,
      eventTime: body.eventTime!,
      rsvpLink: body.rsvpLink!,
      headerImageUrl: resolvedHeaderImageUrl, // ✅ תמיד תמונה בפועל
      templateName: body.templateName,
      languageCode: body.languageCode,
    });

    return NextResponse.json(
      {
        success: true,
        headerImageUrlUsed: resolvedHeaderImageUrl,
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
      message.includes("Invalid headerImageUrl");

    return NextResponse.json(
      { success: false, error: message },
      { status: isClientError ? 400 : 500 }
    );
  }
}
