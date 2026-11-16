import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { canManageInvitation } from "@/lib/canManageInvitation";
import {
  bufferFromImageDataUrl,
  bytesForInvitationStorage,
  imageDataUri,
} from "@/lib/whatsapp/invitationImage";

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

    const invitation: any = await Invitation.findById(invitationId);

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!canManageInvitation(auth, invitation)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const finalImageMode = normalizeImageMode(
      imageMode || invitation.orientation
    );

    /*
      Store the original JPEG or PNG when it is already a valid WhatsApp
      header. Do not pad onto a plate and do not add a background.
    */
    const stored = await bytesForInvitationStorage(
      bufferFromImageDataUrl(base64Image)
    );

    const upload = await cloudinary.uploader.upload(
      imageDataUri(stored.buffer, stored.mime),
      {
        folder: "invistimo/invitations",
        resource_type: "image",
        overwrite: true,
      }
    );

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
      },
      {
        $set: {
          orientation: finalImageMode,

          previewImageUrl: imageUrl,
          headerImageUrl: imageUrl,
          imageUrl,
          previewImage: imageUrl,

          // Keep invitation-only / pre-RSVP preview in sync with the couple's
          // permanent invite image. Sends must never clear these fields.
          "preRsvpMedia.invitationOnlyImageUrl": imageUrl,

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
      imageWarning: null,
    });
  } catch (err) {
    console.error("❌ upload-preview error:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}