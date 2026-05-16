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
    const { invitationId, base64Image } = body;

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

    /*
      חשוב:
      לא עושים resize ל-400/720.
      מעלים את התמונה כמו שהיא באיכות גבוהה.
      Cloudinary ישמור את המקור, וה-URL שישלח לוואטסאפ יהיה איכותי.
    */
    const upload = await cloudinary.uploader.upload(base64Image, {
      folder: "invistimo/invitations",
      resource_type: "image",
      overwrite: true,
      quality: "auto:best",
      fetch_format: "auto",
      transformation: [
        {
          flags: "preserve_transparency",
        },
      ],
    });

    const imageUrl = upload.secure_url;

    /*
      חשוב מאוד:
      שומרים גם previewImageUrl וגם headerImageUrl.
      WhatsApp משתמש ב-headerImageUrl.
      האתר והתצוגה משתמשים ב-previewImageUrl.
      previewImage נשאר רק לתאימות אחורה אם יש מקומות ישנים שמשתמשים בו.
    */
    const updated = await Invitation.findOneAndUpdate(
      {
        _id: invitationId,
        ownerId: auth.userId,
      },
      {
        $set: {
          previewImageUrl: imageUrl,
          headerImageUrl: imageUrl,
          previewImage: imageUrl,
          imageUrl,
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