import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { canManageInvitation } from "@/lib/canManageInvitation";
import { cloudinaryFolder } from "@/lib/cloudinaryFolder";
import { getInvitationRsvpSiteMode } from "@/lib/guestInviteUrl";
import { hasWeddingWebsiteFeature } from "@/lib/features/entitlements";
import { isPersonalRsvpSite } from "@/types/rsvpSite";
import { getOptimizedWeddingImageUrl } from "@/lib/weddingWebsite/images";
import { collectContentMediaLibrary, mediaSlotFromImageUrl } from "@/lib/weddingWebsite/media";
import { serializeWeddingWebsite } from "@/lib/weddingWebsite/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_MB = 8;
const MAX_VIDEO_MB = 40;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const ALLOWED_TYPES = ALLOWED_IMAGE_TYPES;

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function assertCloudinaryConfig() {
  const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL);
  const hasSeparateKeys = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

  if (!hasCloudinaryUrl && !hasSeparateKeys) {
    throw new Error("חסרה הגדרת Cloudinary בשרת.");
  }

  if (!hasCloudinaryUrl) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
}

async function findManagedInvitation(auth: any, invitationId?: string | null) {
  if (invitationId) {
    const invitation = await Invitation.findById(invitationId).lean();
    if (invitation && canManageInvitation(auth, invitation)) return invitation;
  }

  const invitation = await Invitation.findOne({ ownerId: auth.userId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  if (invitation && canManageInvitation(auth, invitation)) return invitation;
  return null;
}

async function uploadMediaToCloudinary({
  file,
  invitationId,
  resourceType,
}: {
  file: File;
  invitationId: string;
  resourceType: "image" | "video" | "auto";
}) {
  assertCloudinaryConfig();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const originalName = cleanString(file.name).replace(/\.[^/.]+$/, "");
  const safeName =
    originalName
      .replace(/[^\w\u0590-\u05FF-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "wedding-image";

  const folder = cloudinaryFolder("wedding-website", invitationId);
  const publicId = `${safeName}-${Date.now()}`;

  return await new Promise<{
    url: string;
    publicId: string;
    width?: number;
    height?: number;
    format?: string;
    bytes?: number;
  }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        overwrite: false,
        invalidate: true,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result?.secure_url) {
          reject(new Error("העלאת התמונה נכשלה."));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export async function POST(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const formData = await req.formData();
    const invitationId = cleanString(formData.get("invitationId"));
    const imageEntry = formData.get("image") || formData.get("file") || formData.get("video");
    const mediaFile = imageEntry instanceof File ? imageEntry : null;

    const invitation = await findManagedInvitation(auth, invitationId || null);
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const owner = invitation.ownerId
      ? await User.findById(invitation.ownerId)
          .select("rsvpSiteMode guestExperienceType features")
          .lean()
      : null;
    const rsvpSiteMode = getInvitationRsvpSiteMode(invitation);
    if (!hasWeddingWebsiteFeature(owner) && !isPersonalRsvpSite(rsvpSiteMode)) {
      return NextResponse.json(
        { success: false, error: "WEDDING_WEBSITE_NOT_ENABLED" },
        { status: 403 }
      );
    }

    if (!mediaFile) {
      return NextResponse.json(
        { success: false, error: "MISSING_IMAGE" },
        { status: 400 }
      );
    }

    const mime = cleanString(mediaFile.type).toLowerCase();
    const isVideo = mime.startsWith("video/") || ALLOWED_VIDEO_TYPES.has(mime);
    const isImage = mime.startsWith("image/") || ALLOWED_IMAGE_TYPES.has(mime);
    if (!isVideo && !isImage) {
      return NextResponse.json(
        { success: false, error: "INVALID_IMAGE_TYPE" },
        { status: 400 }
      );
    }

    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    const maxMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (mediaFile.size > maxBytes) {
      return NextResponse.json(
        {
          success: false,
          error: "IMAGE_TOO_LARGE",
          message: `הקובץ גדול מדי. ניתן להעלות עד ${maxMb}MB.`,
        },
        { status: 400 }
      );
    }

    const uploaded = await uploadMediaToCloudinary({
      file: mediaFile,
      invitationId: String(invitation._id),
      resourceType: isVideo ? "video" : "image",
    });

    return NextResponse.json({
      success: true,
      url: uploaded.url,
      optimizedUrl: isVideo ? uploaded.url : getOptimizedWeddingImageUrl(uploaded.url, 1600),
      publicId: uploaded.publicId,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
      bytes: uploaded.bytes,
      resourceType: isVideo ? "video" : "image",
    });
  } catch (error) {
    console.error("WEDDING WEBSITE MEDIA UPLOAD FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await db();
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const invitationId = req.nextUrl.searchParams.get("invitationId");
    const invitation = await findManagedInvitation(auth, invitationId);
    if (!invitation) {
      return NextResponse.json({ success: false, error: "INVITATION_NOT_FOUND" }, { status: 404 });
    }

    const draft = serializeWeddingWebsite(invitation, { draft: true });
    const items = collectContentMediaLibrary(draft.draftContent || draft.content);

    try {
      assertCloudinaryConfig();
      const folder = cloudinaryFolder("wedding-website", String(invitation._id));
      const result = await cloudinary.search
        .expression(`folder:"${folder}"`)
        .max_results(40)
        .execute();
      for (const resource of result.resources || []) {
        const url = resource.secure_url;
        if (!url) continue;
        if (items.some((item) => item.src === url)) continue;
        items.push({
          ...mediaSlotFromImageUrl(url),
          type: resource.resource_type === "video" ? "video" : "image",
        });
      }
    } catch {
      // library listing is best-effort
    }

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("WEDDING WEBSITE MEDIA LIST FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
