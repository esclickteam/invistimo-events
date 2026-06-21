import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= TYPES ================= */

type PreRsvpMessageType = "save_the_date" | "invitation_only";

/* ================= CONFIG ================= */

const CLOUDINARY_FOLDER = "invistimo/pre-rsvp";
const MAX_IMAGE_MB = 12;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

/* ================= HELPERS ================= */

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id) return null;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  return new mongoose.Types.ObjectId(id);
}

function validateMessageType(value: unknown): PreRsvpMessageType | null {
  const type = cleanString(value);

  if (type === "save_the_date" || type === "invitation_only") {
    return type;
  }

  return null;
}

function getHighQualityCloudinaryImageUrl(value: unknown) {
  const url = cleanString(value);

  if (!url) return "";

  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  const [beforeUpload, afterUpload] = url.split("/upload/");

  if (!beforeUpload || !afterUpload) return url;

  const cleanedAfterUpload = afterUpload
    .replace(/^f_auto,q_auto[^/]*\//, "")
    .replace(/^q_auto,f_auto[^/]*\//, "")
    .replace(/^q_auto[^/]*\//, "")
    .replace(/^f_auto[^/]*\//, "")
    .replace(/^c_fill[^/]*\//, "")
    .replace(/^c_fit[^/]*\//, "")
    .replace(/^c_pad[^/]*\//, "")
    .replace(/^w_\d+[^/]*\//, "")
    .replace(/^h_\d+[^/]*\//, "");

  return `${beforeUpload}/upload/q_100,f_png/${cleanedAfterUpload}`;
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

async function uploadImageToCloudinary({
  file,
  invitationId,
  messageType,
}: {
  file: File;
  invitationId: string;
  messageType: PreRsvpMessageType;
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
      .slice(0, 80) || "pre-rsvp-image";

  const folder = `${CLOUDINARY_FOLDER}/${invitationId}/${messageType}`;
  const publicId = `${safeName}-${Date.now()}`;

  return await new Promise<{
    secureUrl: string;
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
        resource_type: "image",
        overwrite: false,
        quality_analysis: true,
        colors: true,
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
          secureUrl: getHighQualityCloudinaryImageUrl(result.secure_url),
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

function buildMediaSetData({
  messageType,
  imageUrl,
  publicId,
}: {
  messageType: PreRsvpMessageType;
  imageUrl: string;
  publicId: string;
}) {
  if (messageType === "save_the_date") {
    return {
      "preRsvpMedia.saveTheDateImageUrl": imageUrl,
      "preRsvpMedia.saveTheDateImagePublicId": publicId,
    };
  }

  return {
    "preRsvpMedia.invitationOnlyImageUrl": imageUrl,
    "preRsvpMedia.invitationOnlyImagePublicId": publicId,
  };
}

function buildMediaClearData(messageType: PreRsvpMessageType) {
  if (messageType === "save_the_date") {
    return {
      "preRsvpMedia.saveTheDateImageUrl": "",
      "preRsvpMedia.saveTheDateImagePublicId": "",
    };
  }

  return {
    "preRsvpMedia.invitationOnlyImageUrl": "",
    "preRsvpMedia.invitationOnlyImagePublicId": "",
  };
}

function getCurrentPublicId({
  invitation,
  messageType,
}: {
  invitation: any;
  messageType: PreRsvpMessageType;
}) {
  if (messageType === "save_the_date") {
    return cleanString(invitation?.preRsvpMedia?.saveTheDateImagePublicId);
  }

  return cleanString(invitation?.preRsvpMedia?.invitationOnlyImagePublicId);
}

async function findInvitationForUser({
  invitationId,
  userId,
}: {
  invitationId: string;
  userId: string;
}) {
  const invitationObjectId = toObjectId(invitationId);
  const userObjectId = toObjectId(userId);

  if (!invitationObjectId) return null;

  const permissionFilters: any[] = [];

  if (userObjectId) {
    permissionFilters.push({ ownerId: userObjectId });
    permissionFilters.push({ userId: userObjectId });
    permissionFilters.push({ producerId: userObjectId });
  }

  if (userId) {
    permissionFilters.push({ ownerId: userId });
    permissionFilters.push({ userId });
    permissionFilters.push({ producerId: userId });
  }

  if (permissionFilters.length === 0) return null;

  return await Invitation.findOne({
    _id: invitationObjectId,
    $or: permissionFilters,
  }).select("_id ownerId userId producerId preRsvpMedia");
}

/* ================= ROUTES ================= */

export async function POST(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const formData = await req.formData();

    const invitationId = cleanString(formData.get("invitationId"));
    const messageType = validateMessageType(formData.get("messageType"));
    const imageEntry = formData.get("image");
    const imageFile = imageEntry instanceof File ? imageEntry : null;

    const invitationObjectId = toObjectId(invitationId);

    if (!invitationObjectId) {
      return NextResponse.json(
        { success: false, error: "לא נמצאה הזמנה תקינה." },
        { status: 400 }
      );
    }

    if (!messageType) {
      return NextResponse.json(
        { success: false, error: "סוג התמונה לא תקין." },
        { status: 400 }
      );
    }

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: "לא נבחרה תמונה להעלאה." },
        { status: 400 }
      );
    }

    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json(
        {
          success: false,
          error: "סוג הקובץ לא תקין. יש להעלות תמונה בלבד.",
        },
        { status: 400 }
      );
    }

    if (imageFile.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `התמונה גדולה מדי. ניתן להעלות תמונה עד ${MAX_IMAGE_MB}MB.`,
        },
        { status: 400 }
      );
    }

    const invitation: any = await findInvitationForUser({
      invitationId,
      userId: String(auth.userId),
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "ההזמנה לא נמצאה או שאין הרשאה." },
        { status: 404 }
      );
    }

    const uploadResult = await uploadImageToCloudinary({
      file: imageFile,
      invitationId,
      messageType,
    });

    const setData = buildMediaSetData({
      messageType,
      imageUrl: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
    });

    await Invitation.updateOne(
      { _id: invitationObjectId },
      {
        $set: setData,
      }
    );

    return NextResponse.json({
      success: true,
      message: "התמונה נשמרה בהצלחה.",
      messageType,
      imageUrl: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    });
  } catch (err: any) {
    console.error("❌ PRE RSVP MEDIA UPLOAD ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "שמירת התמונה נכשלה.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const invitationId = cleanString(body?.invitationId);
    const messageType = validateMessageType(body?.messageType);

    const invitationObjectId = toObjectId(invitationId);

    if (!invitationObjectId) {
      return NextResponse.json(
        { success: false, error: "לא נמצאה הזמנה תקינה." },
        { status: 400 }
      );
    }

    if (!messageType) {
      return NextResponse.json(
        { success: false, error: "סוג התמונה לא תקין." },
        { status: 400 }
      );
    }

    const invitation: any = await findInvitationForUser({
      invitationId,
      userId: String(auth.userId),
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "ההזמנה לא נמצאה או שאין הרשאה." },
        { status: 404 }
      );
    }

    const publicId = getCurrentPublicId({ invitation, messageType });
    const clearData = buildMediaClearData(messageType);

    await Invitation.updateOne(
      { _id: invitationObjectId },
      {
        $set: clearData,
      }
    );

    if (publicId) {
      cloudinary.uploader
        .destroy(publicId, {
          resource_type: "image",
          invalidate: true,
        })
        .catch((error) => {
          console.warn("⚠️ PRE RSVP CLOUDINARY DELETE WARNING:", error);
        });
    }

    return NextResponse.json({
      success: true,
      message: "התמונה הוסרה בהצלחה.",
      messageType,
    });
  } catch (err: any) {
    console.error("❌ PRE RSVP MEDIA DELETE ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "הסרת התמונה נכשלה.",
      },
      { status: 500 }
    );
  }
}
