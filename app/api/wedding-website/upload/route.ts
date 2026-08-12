import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import db from "@/lib/db";
import WeddingWebsite from "@/models/WeddingWebsite";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { canManageInvitation } from "@/lib/canManageInvitation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST — upload an image for Wedding Website only (hero/gallery).
 * Does not mutate Invitation canvas/guests.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const websiteId = typeof body.websiteId === "string" ? body.websiteId.trim() : "";
    const base64Image = typeof body.base64Image === "string" ? body.base64Image : "";

    if (!websiteId || !base64Image.startsWith("data:image")) {
      return NextResponse.json(
        { success: false, error: "websiteId and base64Image required" },
        { status: 400 }
      );
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Upload service not configured" },
        { status: 503 }
      );
    }

    await db();
    const website = await WeddingWebsite.findById(websiteId);
    if (!website) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const invitation = await Invitation.findById(website.invitationId).lean();
    if (!invitation || !canManageInvitation(auth, invitation)) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const upload = await cloudinary.uploader.upload(base64Image, {
      folder: "wedding-websites",
      resource_type: "image",
      overwrite: true,
    });

    return NextResponse.json({
      success: true,
      url: upload.secure_url,
      width: upload.width,
      height: upload.height,
    });
  } catch (err) {
    console.error("[wedding-website upload]", err);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
