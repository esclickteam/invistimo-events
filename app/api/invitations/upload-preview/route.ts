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

    /* =========================
       Upload to Cloudinary
       שומר תמונה חדשה באיכות גבוהה
    ========================= */
    const upload = await cloudinary.uploader.upload(base64Image, {
      folder: "invistimo/invitations",
      resource_type: "image",

      // לא דורס URL ישן כדי למנוע קאש/תמונה ישנה
      overwrite: false,
      invalidate: true,

      // פורמט יציב לוואטסאפ
      format: "jpg",

      // איכות גבוהה בלי להגדיל מעבר למקור
      transformation: [
        {
          width: 1600,
          crop: "limit",
          quality: "100",
          fetch_format: "jpg",
        },
      ],
    });

    const imageUrl = upload.secure_url;

    /* =========================
       Save URL in Invitation
       בלי שדה ייעודי לוואטסאפ
    ========================= */
    await Invitation.updateOne(
      { _id: invitationId },
      {
        $set: {
          previewImage: imageUrl,
          headerImageUrl: imageUrl,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      imageUrl,
      previewImage: imageUrl,
      headerImageUrl: imageUrl,
    });
  } catch (err) {
    console.error("❌ upload-preview error:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}