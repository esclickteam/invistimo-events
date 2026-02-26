import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

import "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";

import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   Cloudinary config
============================================================ */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/* ============================================================
   Helpers
============================================================ */

function isNonEmptyString(v: unknown) {
  return typeof v === "string" && v.trim().length > 0;
}

function toBool(v: unknown) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function cleanUrl(v: unknown) {
  if (typeof v !== "string") return "";
  return v.trim();
}

function normalizeGiftOptions(input: any) {
  const creditEnabled = toBool(input?.creditEnabled);
  const payboxEnabled = toBool(input?.payboxEnabled);

  const creditUrl = creditEnabled ? cleanUrl(input?.creditUrl) : "";
  const payboxUrl = payboxEnabled ? cleanUrl(input?.payboxUrl) : "";

  return {
    creditEnabled,
    creditUrl,
    payboxEnabled,
    payboxUrl,
  };
}

function pickBase64Image(body: any): string {
  const v = body?.previewBase64 ?? body?.base64Image ?? body?.previewImageBase64;
  return typeof v === "string" ? v : "";
}

function isValidBase64Image(v: string) {
  return typeof v === "string" && v.startsWith("data:image");
}

/* ============================================================
   📥 GET — שליפת הזמנה לפי invitationId או eventId
============================================================ */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db();

    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    // 🔥 חיפוש חכם: קודם לפי _id, אם לא נמצא — לפי eventId
    const invitation =
      (await Invitation.findById(id).populate("guests").lean()) ||
      (await Invitation.findOne({ eventId: id }).populate("guests").lean());

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation,
    });
  } catch (err) {
    console.error("❌ Error in GET /api/invitations/[id]:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

/* ============================================================
   💾 PUT — עדכון הזמנה קיימת (עדכון כללי)
   ✅ כולל העלאת preview חדש ל-Cloudinary אם הגיע previewBase64/base64Image
============================================================ */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db();

    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const {
      title,
      eventType,
      eventDate,
      eventTime,
      canvasData,
      location,
      orientation,
    } = body;

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (typeof title === "string" && title.trim()) {
      updatePayload.title = title.trim();
    }

    if (typeof eventType === "string" && eventType.trim()) {
      updatePayload.eventType = eventType.trim();
    }

    if (eventDate) {
      updatePayload.eventDate = new Date(eventDate);
    }

    if (typeof eventTime === "string" && eventTime.trim()) {
      updatePayload.eventTime = eventTime;
    }

    if (orientation === "portrait" || orientation === "landscape") {
      updatePayload.orientation = orientation;
    }

    if (
      location &&
      ((typeof location.address === "string" && location.address.trim()) ||
        location.lat !== undefined ||
        location.lng !== undefined)
    ) {
      updatePayload.location = {
        name: typeof location.name === "string" ? location.name.trim() : "",
        address:
          typeof location.address === "string" ? location.address.trim() : "",
        lat: typeof location.lat === "number" ? location.lat : null,
        lng: typeof location.lng === "number" ? location.lng : null,
      };
    }

    if (canvasData !== undefined) {
      updatePayload.canvasData = canvasData;
    }

    /* =========================
       ✅ NEW: Upload preview image if provided
    ========================= */
    const previewBase64 = pickBase64Image(body);

    if (isNonEmptyString(previewBase64)) {
      if (!isValidBase64Image(previewBase64)) {
        return NextResponse.json(
          { success: false, error: "INVALID_IMAGE_FORMAT" },
          { status: 400 }
        );
      }

      // public_id חדש בכל שמירה => URL חדש תמיד
      const publicId = `invistimo/invitations/${id}_${Date.now()}`;

      const upload = await cloudinary.uploader.upload(previewBase64, {
        public_id: publicId,
        resource_type: "image",
        overwrite: false,
        invalidate: true,
      });

      const imageUrl = upload.secure_url;

      updatePayload.previewImage = imageUrl;
      updatePayload.headerImageUrl = imageUrl; // ✅ כדי שוואטספ תמיד יקח חדש
    }

    const updated = await Invitation.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true }
    )
      .populate("guests")
      .lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: updated,
      // עוזר לדיבאג: האם באמת שמרנו לינק חדש
      previewImage: updated.previewImage ?? null,
      headerImageUrl: (updated as any).headerImageUrl ?? null,
    });
  } catch (err: any) {
    console.error("❌ Error in PUT /api/invitations/[id]:", err?.message || err);
    return NextResponse.json(
      { success: false, error: "Server error while updating" },
      { status: 500 }
    );
  }
}

/* ============================================================
   🩹 PATCH — עדכון חלקי (giftOptions וכו')
============================================================ */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db();

    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    /* ================= GIFT OPTIONS ================= */
    if (body?.giftOptions !== undefined) {
      updatePayload.giftOptions = normalizeGiftOptions(body.giftOptions);
    }

    /* ================= INVITATION SETTINGS ================= */
    if (body?.invitationSettings !== undefined) {
      updatePayload.invitationSettings = body.invitationSettings;
    }

    /* אם לא הגיע שום דבר לעדכון */
    if (Object.keys(updatePayload).length === 1) {
      return NextResponse.json(
        { success: false, error: "NO_FIELDS_TO_UPDATE" },
        { status: 400 }
      );
    }

    const updated = await Invitation.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true }
    )
      .populate("guests")
      .lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: updated,
    });
  } catch (err) {
    console.error("❌ Error in PATCH /api/invitations/[id]:", err);
    return NextResponse.json(
      { success: false, error: "Server error while patching" },
      { status: 500 }
    );
  }
}