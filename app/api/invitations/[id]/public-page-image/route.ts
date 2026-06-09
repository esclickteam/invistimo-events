import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

import db from "@/lib/db";
import Invitation from "@/models/Invitation";

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

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function isValidBase64Image(value: unknown) {
  return typeof value === "string" && value.startsWith("data:image");
}

/* ============================================================
   POST — Upload public event page couple image
   Route:
   /api/invitations/[id]/public-page-image
============================================================ */

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await db();

    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "INVALID_INVITATION_ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const imageBase64 = cleanString(body?.imageBase64);

    if (!isValidBase64Image(imageBase64)) {
      return NextResponse.json(
        { success: false, error: "INVALID_IMAGE_FORMAT" },
        { status: 400 }
      );
    }

    const invitation = await Invitation.findById(id).lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const publicId = `invistimo/public-event-pages/${id}/couple_${Date.now()}`;

    const upload = await cloudinary.uploader.upload(imageBase64, {
      public_id: publicId,
      resource_type: "image",
      overwrite: false,
      invalidate: true,
      folder: undefined,
      transformation: [
        {
          width: 1400,
          height: 1000,
          crop: "fill",
          gravity: "auto",
          quality: "auto:good",
          fetch_format: "auto",
        },
      ],
    });

    const imageUrl = upload.secure_url;

    await Invitation.findByIdAndUpdate(
      id,
      {
        $set: {
          "publicEventPage.coupleImage.enabled": true,
          "publicEventPage.coupleImage.url": imageUrl,
          "publicEventPage.coupleImage.publicId": upload.public_id,
          updatedAt: new Date(),
        },
      },
      {
        new: true,
        strict: false,
      }
    );

    return NextResponse.json({
      success: true,
      url: imageUrl,
      publicId: upload.public_id,
    });
  } catch (err: any) {
    console.error(
      "❌ Error in POST /api/invitations/[id]/public-page-image:",
      err?.message || err
    );

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR_UPLOAD_PUBLIC_PAGE_IMAGE" },
      { status: 500 }
    );
  }
}