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
   Helpers
========================= */

function normalizeImageMode(value: any): "portrait" | "square" {
  return value === "square" ? "square" : "portrait";
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
    const { invitationId, base64Image, imageMode } = body;

    if (!invitationId || !base64Image) {
      return NextResponse.json(
        { success: false, error: "MISSING_DATA" },
        { status: 400 }
      );
    }

    if (
      typeof base64Image !== "string" ||
      !base64Image.startsWith("data:image")
    ) {
      return NextResponse.json(
        { success: false, error: "INVALID_IMAGE_FORMAT" },
        { status: 400 }
      );
    }

    const invitation: any = await Invitation.findOne({
      _id: invitationId,
      ownerId: auth.userId,
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const finalImageMode = normalizeImageMode(
      imageMode || invitation.orientation
    );

    const targetWidth = finalImageMode === "square" ? 1080 : 1080;
    const targetHeight = finalImageMode === "square" ? 1080 : 1920;

    /*
      חשוב:
      כאן אנחנו שומרים את התמונה בגודל קבוע שמתאים להזמנה.
      portrait = 1080x1920
      square = 1080x1080

      crop: "pad" שומר את כל התמונה בלי חיתוך.
      background: "#ffffff" מוסיף רקע לבן אם היחס לא תואם בדיוק.
      quality: "100" שומר איכות גבוהה.
      format: "jpg" מייצר קובץ שמתאים טוב לוואטסאפ.
    */
    const upload = await cloudinary.uploader.upload(base64Image, {
      folder: "invistimo/invitations",
      resource_type: "image",
      overwrite: true,
      format: "jpg",
      transformation: [
        {
          width: targetWidth,
          height: targetHeight,
          crop: "pad",
          background: "#ffffff",
          quality: "100",
        },
      ],
    });

    const imageUrl = upload.secure_url;

    /*
      חשוב מאוד:
      שומרים בכל השדות שהמערכת משתמשת בהם.
      WhatsApp משתמש ב-headerImageUrl.
      האתר והתצוגות משתמשים ב-previewImageUrl / imageUrl.
      previewImage נשאר לתאימות אחורה.
    */
    const updated = await Invitation.findOneAndUpdate(
      {
        _id: invitationId,
        ownerId: auth.userId,
      },
      {
        $set: {
          orientation: finalImageMode,

          previewImageUrl: imageUrl,
          headerImageUrl: imageUrl,
          imageUrl,
          previewImage: imageUrl,

          updatedAt: new Date(),
        },
      },
      {
        new: true,
      }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      previewImageUrl: imageUrl,
      headerImageUrl: imageUrl,
      imageMode: finalImageMode,
      width: upload.width,
      height: upload.height,
      format: upload.format,
      bytes: upload.bytes,
    });
  } catch (err) {
    console.error("❌ upload-preview error:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}