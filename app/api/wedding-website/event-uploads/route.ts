import { NextRequest, NextResponse } from "next/server";

import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import WeddingEventUpload from "@/models/WeddingEventUpload";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import { canManageInvitation } from "@/lib/canManageInvitation";
import { hasWeddingWebsiteFeature } from "@/lib/features/entitlements";
import { getInvitationRsvpSiteMode } from "@/lib/guestInviteUrl";
import { isPersonalRsvpSite } from "@/types/rsvpSite";
import { uploadWeddingFileToCloudinary } from "@/lib/weddingWebsite/cloudinaryUpload";
import {
  EVENT_UPLOAD_MAX_IMAGE_BYTES,
  EVENT_UPLOAD_MAX_IMAGE_MB,
  EVENT_UPLOAD_MAX_VIDEO_BYTES,
  EVENT_UPLOAD_MAX_VIDEO_MB,
  eventUploadExpiresAt,
  serializeEventUpload,
} from "@/lib/weddingWebsite/eventUploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function cleanString(value: unknown) {
  return String(value || "").trim();
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

export async function GET(req: NextRequest) {
  try {
    await db();
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const invitation = await findManagedInvitation(
      auth,
      req.nextUrl.searchParams.get("invitationId")
    );
    if (!invitation) {
      return NextResponse.json({ success: false, error: "INVITATION_NOT_FOUND" }, { status: 404 });
    }

    const items = await WeddingEventUpload.find({
      invitationId: invitation._id,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({
      success: true,
      items: items.map(serializeEventUpload),
      ttlDays: 90,
    });
  } catch (error) {
    console.error("COUPLE EVENT UPLOADS GET FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await db();
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const formData = await req.formData();
    const invitation = await findManagedInvitation(auth, cleanString(formData.get("invitationId")));
    if (!invitation) {
      return NextResponse.json({ success: false, error: "INVITATION_NOT_FOUND" }, { status: 404 });
    }

    const owner = invitation.ownerId
      ? await User.findById(invitation.ownerId)
          .select("features rsvpSiteMode guestExperienceType")
          .lean()
      : null;
    if (
      !hasWeddingWebsiteFeature(owner) &&
      !isPersonalRsvpSite(getInvitationRsvpSiteMode(invitation))
    ) {
      return NextResponse.json({ success: false, error: "WEDDING_WEBSITE_NOT_ENABLED" }, { status: 403 });
    }

    const fileEntry = formData.get("file") || formData.get("image") || formData.get("video");
    const file = fileEntry instanceof File ? fileEntry : null;
    if (!file) {
      return NextResponse.json({ success: false, error: "MISSING_FILE" }, { status: 400 });
    }

    const mime = cleanString(file.type).toLowerCase();
    const isVideo = mime.startsWith("video/") || ALLOWED_VIDEO_TYPES.has(mime);
    const isImage = mime.startsWith("image/") || ALLOWED_IMAGE_TYPES.has(mime);
    if (!isVideo && !isImage) {
      return NextResponse.json({ success: false, error: "INVALID_FILE_TYPE" }, { status: 400 });
    }

    const maxBytes = isVideo ? EVENT_UPLOAD_MAX_VIDEO_BYTES : EVENT_UPLOAD_MAX_IMAGE_BYTES;
    const maxMb = isVideo ? EVENT_UPLOAD_MAX_VIDEO_MB : EVENT_UPLOAD_MAX_IMAGE_MB;
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          success: false,
          error: "FILE_TOO_LARGE",
          message: `הקובץ גדול מדי. ניתן להעלות עד ${maxMb}MB.`,
        },
        { status: 400 }
      );
    }

    const uploaded = await uploadWeddingFileToCloudinary({
      file,
      invitationId: String(invitation._id),
      folderKind: "event-uploads",
      resourceType: isVideo ? "video" : "image",
    });

    const created = await WeddingEventUpload.create({
      eventId: invitation.eventId || null,
      invitationId: invitation._id,
      guestId: null,
      shareId: invitation.shareId || "",
      source: "couple",
      type: isVideo ? "video" : "image",
      url: uploaded.url,
      publicId: uploaded.publicId,
      originalName: file.name,
      uploadedByName: cleanString(formData.get("uploadedBy")) || "הזוג",
      expiresAt: eventUploadExpiresAt(),
    });

    return NextResponse.json({
      success: true,
      item: serializeEventUpload(created),
    });
  } catch (error) {
    console.error("COUPLE EVENT UPLOADS POST FAILED:", error);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
