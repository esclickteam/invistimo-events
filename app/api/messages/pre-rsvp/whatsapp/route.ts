import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import ScheduledMessage from "@/models/ScheduledMessage";
import WhatsappQueue from "@/models/WhatsappQueue";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= TYPES ================= */

type PreRsvpMessageType = "save_the_date" | "invitation_only";
type SendTiming = "scheduled" | "immediate";

type TemplateVariables = {
  saveTheDateTitle?: string;
  invitationTitle?: string;
  eventDate?: string;
  eventLocation?: string;
};

/* ================= CONFIG ================= */

const SAVE_THE_DATE_TEMPLATE_NAME = "save_the_date_image_he";
const EVENT_INVITATION_TEMPLATE_NAME = "event_invitation_image_he";

const CLOUDINARY_FOLDER = "invistimo/pre-rsvp";
const DEFAULT_BATCH_SIZE = 50;

/* ================= HELPERS ================= */

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function isValidObjectId(value: unknown) {
  return mongoose.Types.ObjectId.isValid(cleanString(value));
}

function toObjectId(value: unknown) {
  const id = cleanString(value);
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

function normalizeIsraeliPhone(value: unknown) {
  const raw = cleanString(value);
  const digits = raw.replace(/\D/g, "");

  if (!digits) return "";

  if (/^05\d{8}$/.test(digits)) {
    return digits;
  }

  if (/^9725\d{8}$/.test(digits)) {
    return `0${digits.slice(3)}`;
  }

  if (/^5\d{8}$/.test(digits)) {
    return `0${digits}`;
  }

  return digits;
}

function parseJsonObject(value: unknown): Record<string, any> {
  const raw = cleanString(value);

  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }

    return {};
  } catch {
    return {};
  }
}

function getGuestPhone(guest: any) {
  return normalizeIsraeliPhone(
    guest?.phone ||
      guest?.phoneNumber ||
      guest?.mobile ||
      guest?.whatsapp ||
      guest?.contactPhone ||
      ""
  );
}

function getTemplateNameByType(messageType: PreRsvpMessageType) {
  if (messageType === "save_the_date") {
    return SAVE_THE_DATE_TEMPLATE_NAME;
  }

  return EVENT_INVITATION_TEMPLATE_NAME;
}

function validateMessageType(value: unknown): PreRsvpMessageType | null {
  const type = cleanString(value);

  if (type === "save_the_date" || type === "invitation_only") {
    return type;
  }

  return null;
}

function validateSendTiming(value: unknown): SendTiming | null {
  const timing = cleanString(value);

  if (timing === "scheduled" || timing === "immediate") {
    return timing;
  }

  return null;
}

function buildScheduledAt(dateValue: unknown, timeValue: unknown) {
  const date = cleanString(dateValue);
  const time = cleanString(timeValue);

  if (!date || !time) return null;

  const offset = cleanString(process.env.PRE_RSVP_TIMEZONE_OFFSET) || "+03:00";
  const scheduledAt = new Date(`${date}T${time}:00${offset}`);

  if (Number.isNaN(scheduledAt.getTime())) return null;

  return scheduledAt;
}

function assertCloudinaryConfig() {
  const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL);

  const hasSeparateKeys = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

  if (!hasCloudinaryUrl && !hasSeparateKeys) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
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
    url: string;
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
        quality: "auto:good",
        fetch_format: "auto",
        transformation: [
          {
            width: 1200,
            height: 1200,
            crop: "limit",
          },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url) {
          reject(new Error("CLOUDINARY_UPLOAD_FAILED"));
          return;
        }

        resolve({
          url: result.url,
          secureUrl: result.secure_url,
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

function buildTemplateVariables({
  messageType,
  rawVariables,
  fallbackSaveTheDateTitle,
}: {
  messageType: PreRsvpMessageType;
  rawVariables: Record<string, any>;
  fallbackSaveTheDateTitle: string;
}): TemplateVariables {
  if (messageType === "save_the_date") {
    return {
      saveTheDateTitle: cleanString(
        rawVariables.saveTheDateTitle || fallbackSaveTheDateTitle
      ),
      eventDate: cleanString(rawVariables.eventDate),
    };
  }

  return {
    invitationTitle: cleanString(rawVariables.invitationTitle),
    eventDate: cleanString(rawVariables.eventDate),
    eventLocation: cleanString(rawVariables.eventLocation),
  };
}

function validateTemplateVariables({
  messageType,
  variables,
}: {
  messageType: PreRsvpMessageType;
  variables: TemplateVariables;
}) {
  if (messageType === "save_the_date") {
    if (!cleanString(variables.saveTheDateTitle)) {
      return "MISSING_SAVE_THE_DATE_TITLE";
    }

    if (!cleanString(variables.eventDate)) {
      return "MISSING_EVENT_DATE";
    }

    return "";
  }

  if (!cleanString(variables.invitationTitle)) {
    return "MISSING_INVITATION_TITLE";
  }

  if (!cleanString(variables.eventDate)) {
    return "MISSING_EVENT_DATE";
  }

  if (!cleanString(variables.eventLocation)) {
    return "MISSING_EVENT_LOCATION";
  }

  return "";
}

function buildWhatsappTemplatePayload({
  messageType,
  imageUrl,
  cloudinaryPublicId,
  templateVariables,
  previewMessage,
  templateMessage,
}: {
  messageType: PreRsvpMessageType;
  imageUrl: string;
  cloudinaryPublicId: string;
  templateVariables: TemplateVariables;
  previewMessage: string;
  templateMessage: string;
}) {
  const bodyParameters =
    messageType === "save_the_date"
      ? [
          {
            type: "text",
            text: cleanString(templateVariables.saveTheDateTitle),
          },
          {
            type: "text",
            text: cleanString(templateVariables.eventDate),
          },
        ]
      : [
          {
            type: "text",
            text: cleanString(templateVariables.invitationTitle),
          },
          {
            type: "text",
            text: cleanString(templateVariables.eventDate),
          },
          {
            type: "text",
            text: cleanString(templateVariables.eventLocation),
          },
        ];

  return {
    languageCode: "he",
    imageUrl,
    headerImageUrl: imageUrl,
    cloudinaryPublicId,

    templateVariables,
    previewMessage,
    templateMessage,

    components: [
      {
        type: "header",
        parameters: [
          {
            type: "image",
            image: {
              link: imageUrl,
            },
          },
        ],
      },
      {
        type: "body",
        parameters: bodyParameters,
      },
    ],
  };
}

function buildIdempotencyKey({
  invitationId,
  guestId,
  messageType,
  templateName,
}: {
  invitationId: string;
  guestId: string;
  messageType: PreRsvpMessageType;
  templateName: string;
}) {
  return [
    "whatsapp",
    "pre-rsvp",
    messageType,
    invitationId,
    guestId,
    templateName,
    Date.now(),
  ].join(":");
}

/* ================= ROUTE ================= */

export async function POST(req: NextRequest) {
  try {
    await db();

    const authUserId = await getUserIdFromRequest(req);

    console.log("🟡 PRE RSVP AUTH USER ID:", authUserId);
    console.log(
      "🟡 PRE RSVP COOKIE EXISTS:",
      Boolean(req.headers.get("cookie"))
    );

    const formData = await req.formData();

    const invitationId = cleanString(formData.get("invitationId"));
    const messageType = validateMessageType(formData.get("messageType"));
    const sendTiming = validateSendTiming(formData.get("sendTiming"));

    const scheduledDate = cleanString(formData.get("scheduledDate"));
    const scheduledTime = cleanString(formData.get("scheduledTime"));

    const templateNameFromClient = cleanString(formData.get("templateName"));
    const saveTheDateTitle = cleanString(formData.get("saveTheDateTitle"));

    const templateMessage = cleanString(formData.get("message"));
    const previewMessage = cleanString(formData.get("previewMessage"));

    const rawTemplateVariables = parseJsonObject(
      formData.get("templateVariables")
    );

    const imageEntry = formData.get("image");
    const imageFile = imageEntry instanceof File ? imageEntry : null;

    if (!invitationId || !isValidObjectId(invitationId)) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_INVITATION_ID",
        },
        { status: 400 }
      );
    }

    if (!messageType) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_MESSAGE_TYPE",
        },
        { status: 400 }
      );
    }

    if (!sendTiming) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_SEND_TIMING",
        },
        { status: 400 }
      );
    }

    if (!imageFile) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_IMAGE",
        },
        { status: 400 }
      );
    }

    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_IMAGE_TYPE",
        },
        { status: 400 }
      );
    }

    const maxImageMb = 8;
    const maxImageBytes = maxImageMb * 1024 * 1024;

    if (imageFile.size > maxImageBytes) {
      return NextResponse.json(
        {
          success: false,
          error: `IMAGE_TOO_LARGE_MAX_${maxImageMb}MB`,
        },
        { status: 400 }
      );
    }

    const invitationQuery: any = {
      _id: toObjectId(invitationId),
    };

    if (authUserId && isValidObjectId(authUserId)) {
      invitationQuery.userId = toObjectId(authUserId);
    }

    const invitation: any = await Invitation.findOne(invitationQuery)
      .select("_id userId title")
      .lean();

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: authUserId
            ? "INVITATION_NOT_FOUND"
            : "INVITATION_NOT_FOUND_OR_AUTH_NOT_RESOLVED",
        },
        { status: 404 }
      );
    }

    const userId = String(invitation.userId || authUserId || "");

    if (!userId || !isValidObjectId(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_INVITATION_USER_ID",
        },
        { status: 400 }
      );
    }

    const templateName = getTemplateNameByType(messageType);

    if (templateNameFromClient && templateNameFromClient !== templateName) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_TEMPLATE_NAME",
        },
        { status: 400 }
      );
    }

    const templateVariables = buildTemplateVariables({
      messageType,
      rawVariables: rawTemplateVariables,
      fallbackSaveTheDateTitle: saveTheDateTitle,
    });

    const variablesError = validateTemplateVariables({
      messageType,
      variables: templateVariables,
    });

    if (variablesError) {
      return NextResponse.json(
        {
          success: false,
          error: variablesError,
        },
        { status: 400 }
      );
    }

    const uploadResult = await uploadImageToCloudinary({
      file: imageFile,
      invitationId,
      messageType,
    });

    const imageUrl = uploadResult.secureUrl;

    const whatsappPayload = buildWhatsappTemplatePayload({
      messageType,
      imageUrl,
      cloudinaryPublicId: uploadResult.publicId,
      templateVariables,
      previewMessage,
      templateMessage,
    });

    const guests = await InvitationGuest.find({
      invitationId: toObjectId(invitationId),
    })
      .select("_id phone phoneNumber mobile whatsapp contactPhone")
      .lean();

    const validGuests = guests
      .map((guest: any) => ({
        guest,
        phone: getGuestPhone(guest),
      }))
      .filter((item) => /^05\d{8}$/.test(item.phone));

    if (validGuests.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "NO_VALID_GUEST_PHONES",
        },
        { status: 400 }
      );
    }

    if (sendTiming === "scheduled") {
      const scheduledAt = buildScheduledAt(scheduledDate, scheduledTime);

      if (!scheduledAt) {
        return NextResponse.json(
          {
            success: false,
            error: "INVALID_SCHEDULED_AT",
          },
          { status: 400 }
        );
      }

      const existingScheduledMessage = await ScheduledMessage.findOne({
        invitationId: toObjectId(invitationId),
        type: messageType,
        channel: "whatsapp",
        status: "scheduled",
      }).sort({ createdAt: -1 });

      const schedulePayload = {
        invitationId: toObjectId(invitationId),
        userId: toObjectId(userId),
        channel: "whatsapp",
        type: messageType,
        filter: "all",
        guestIds: [],
        templateKey: messageType,
        roundNumber: 1,
        round: 1,
        templateName,
        messageOverride: "",
        payload: whatsappPayload,
        messageContent: `whatsapp:${templateName}`,
        includeGiftLink: false,
        giftLink: null,
        text: "",
        scheduledAt,
        status: "scheduled",
        guestsCount: validGuests.length,
        sentCount: 0,
        sentGuestIds: [],
        completedGuests: [],
        batchSize: DEFAULT_BATCH_SIZE,
        lastAttemptAt: null,
        sentAt: null,
        cancelledAt: null,
        error: "",
        lockedAt: null,
        lockedBy: null,
        priority: 1,
      };

      let scheduledMessage;

      if (existingScheduledMessage) {
        existingScheduledMessage.set(schedulePayload);
        scheduledMessage = await existingScheduledMessage.save();
      } else {
        scheduledMessage = await ScheduledMessage.create(schedulePayload);
      }

      return NextResponse.json({
        success: true,
        mode: "scheduled",
        message: "PRE_RSVP_WHATSAPP_SCHEDULED",
        scheduleId: String(scheduledMessage._id),
        templateName,
        messageType,
        scheduledAt,
        guestsCount: validGuests.length,
        imageUrl,
        cloudinaryPublicId: uploadResult.publicId,
      });
    }

    const queueDocs = validGuests.map(({ guest, phone }) => {
      const guestId = String(guest._id);

      return {
        invitationId: toObjectId(invitationId),
        guestId: toObjectId(guestId),
        scheduleId: null,

        channel: "whatsapp",
        type: messageType,
        round: 1,
        roundNumber: 1,

        phone,
        templateName,
        idempotencyKey: buildIdempotencyKey({
          invitationId,
          guestId,
          messageType,
          templateName,
        }),

        wamid: null,
        providerStatus: "",

        lockedAt: null,
        lockedBy: null,

        scheduledAt: null,
        payload: whatsappPayload,

        status: "pending",
        attempts: 0,
        maxAttempts: 1,
        lastAttemptAt: null,

        lastError: null,
        errorCode: null,
        errorMessage: null,
        failReason: {
          code: null,
          message: null,
          raw: null,
        },

        sentAt: null,
        deliveredAt: null,
        readAt: null,
        failedAt: null,
        cancelledAt: null,
      };
    });

    const inserted = await WhatsappQueue.insertMany(queueDocs, {
      ordered: false,
    });

    return NextResponse.json({
      success: true,
      mode: "immediate",
      message: "PRE_RSVP_WHATSAPP_QUEUED",
      templateName,
      messageType,
      queuedCount: inserted.length,
      guestsCount: validGuests.length,
      imageUrl,
      cloudinaryPublicId: uploadResult.publicId,
    });
  } catch (err: any) {
    console.error("❌ PRE RSVP WHATSAPP API ERROR:", err);

    if (err?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: "DUPLICATE_WHATSAPP_QUEUE_ITEM",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "PRE_RSVP_WHATSAPP_FAILED",
      },
      { status: 500 }
    );
  }
}