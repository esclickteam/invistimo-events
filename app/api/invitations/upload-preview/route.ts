import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================
   Cloudinary config
========================= */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/* =========================
   HELPERS
========================= */
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/* =========================
   POST – upload preview image
========================= */
export async function POST(req: Request) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { invitationId, base64Image } = body as {
      invitationId?: string;
      base64Image?: string;
    };

    if (!isNonEmptyString(invitationId) || !isNonEmptyString(base64Image)) {
      return NextResponse.json(
        { success: false, error: "MISSING_DATA" },
        { status: 400 }
      );
    }

    if (!base64Image.startsWith("data:image")) {
      return NextResponse.json(
        { success: false, error: "INVALID_IMAGE_FORMAT" },
        { status: 400 }
      );
    }

    // ✅ אבטחה: לוודא שההזמנה שייכת למשתמש (כדי שלא יעדכן הזמנה של אחרים)
    const inv = await Invitation.findOne({
      _id: invitationId,
      ownerId: auth.userId,
    })
      .select("_id")
      .lean();

    if (!inv) {
      return NextResponse.json(
        { success: false, error: "INV_NOT_FOUND_OR_FORBIDDEN" },
        { status: 404 }
      );
    }

    /* =========================
       Upload to Cloudinary
       ✅ public_id חדש בכל שמירה => URL חדש (אין קאש בוואטספ)
    ========================= */
    const publicId = `invistimo/invitations/${invitationId}_${Date.now()}`;

    const upload = await cloudinary.uploader.upload(base64Image, {
      public_id: publicId,      // ✅ חדש בכל שמירה
      folder: undefined,        // ⛔ לא צריך כשיש public_id מלא
      resource_type: "image",
      overwrite: false,         // ✅ חשוב: לא לדרוס אותו public_id
      unique_filename: false,   // לא רלוונטי כשיש public_id
      invalidate: true,         // גם אם יש CDN cache, מבקש invalidate
    });

    const imageUrl = upload.secure_url;

    /* =========================
       Save URL in Invitation
       ✅ אפשר גם לעדכן headerImageUrl אם את משתמשת בו לוואטספ
    ========================= */
    await Invitation.updateOne(
      { _id: invitationId },
      {
        $set: {
          previewImage: imageUrl,
          headerImageUrl: imageUrl, // ✅ מומלץ כדי שוואטספ תמיד יקח את החדש
        },
      }
    );

    return NextResponse.json({
      success: true,
      imageUrl,
      publicId,
    });
  } catch (err: any) {
    console.error("❌ upload-preview error:", err?.message || err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}