import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import ScheduledMessage from "@/models/ScheduledMessage";
import WhatsappQueue from "@/models/WhatsappQueue";
import User from "@/models/User";
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

const BLOCKED_RSVP_TEMPLATE_NAMES = new Set([
  "rsvp_invitation_media",
  "rsvp_reminder_invistimo",
  "table_number_update_invistimo",
  "table_number_update_with_gift",
  "thank_you_message",
]);

const CLOUDINARY_FOLDER = "invistimo/pre-rsvp";
const DEFAULT_BATCH_SIZE = 50;

/* ================= HELPERS ================= */

function cleanString(value: unknown) {
  return String(value || "").trim();
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

function isHttpImageUrl(value: unknown) {
  const url = cleanString(value);

  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeCompareText(value: unknown) {
  return cleanString(value)
    .replace(/\s+/g, " ")
    .replace(/,+/g, ",")
    .replace(/\s*,\s*/g, ", ")
    .trim();
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

function formatEventDate(value: unknown) {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return "";

    const parsed = new Date(trimmed);

    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(parsed);
    }

    return trimmed;
  }

  const parsed = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function buildEventLocationFromInvitation(invitation: any) {
  const locationName = cleanString(invitation?.location?.name);
  const locationAddress = cleanString(invitation?.location?.address);

  const normalizedName = normalizeCompareText(locationName);
  const normalizedAddress = normalizeCompareText(locationAddress);

  if (locationName && locationAddress) {
    if (normalizedName === normalizedAddress) {
      return locationName;
    }

    return `${locationName}, ${locationAddress}`;
  }

  return locationName || locationAddress || "";
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

        const highQualitySecureUrl = getHighQualityCloudinaryImageUrl(
          result.secure_url
        );

        resolve({
          url: result.url,
          secureUrl: highQualitySecureUrl,
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
  fallbackInvitationTitle,
  fallbackEventDate,
  fallbackEventLocation,
}: {
  messageType: PreRsvpMessageType;
  rawVariables: Record<string, any>;
  fallbackSaveTheDateTitle: string;
  fallbackInvitationTitle: string;
  fallbackEventDate: string;
  fallbackEventLocation: string;
}): TemplateVariables {
  if (messageType === "save_the_date") {
    return {
      saveTheDateTitle: cleanString(
        rawVariables.saveTheDateTitle || fallbackSaveTheDateTitle
      ),
      eventDate: cleanString(rawVariables.eventDate || fallbackEventDate),
    };
  }

  return {
    invitationTitle: cleanString(
      rawVariables.invitationTitle || fallbackInvitationTitle
    ),
    eventDate: cleanString(rawVariables.eventDate || fallbackEventDate),
    eventLocation: cleanString(
      rawVariables.eventLocation || fallbackEventLocation
    ),
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
      return "חסרה כותרת ל־Save The Date.";
    }

    if (!cleanString(variables.eventDate)) {
      return "חסר תאריך אירוע.";
    }

    return "";
  }

  if (!cleanString(variables.invitationTitle)) {
    return "חסר שם אירוע לשליחת ההזמנה.";
  }

  if (!cleanString(variables.eventDate)) {
    return "חסר תאריך אירוע.";
  }

  if (!cleanString(variables.eventLocation)) {
    return "חסר מיקום אירוע לשליחת ההזמנה.";
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

function normalizePreRsvpAccessMode(value: unknown) {
  const mode = cleanString(value);

  if (
    mode === "save_the_date_only" ||
    mode === "invitation_only" ||
    mode === "both"
  ) {
    return mode;
  }

  return "none";
}

function canUsePreRsvpMessageType({
  preRsvpUpsell,
  messageType,
}: {
  preRsvpUpsell: any;
  messageType: PreRsvpMessageType;
}) {
  if (!preRsvpUpsell?.enabled) return false;

  const mode = normalizePreRsvpAccessMode(preRsvpUpsell?.mode);

  if (messageType === "save_the_date") {
    return (
      mode === "save_the_date_only" ||
      mode === "both" ||
      preRsvpUpsell?.saveTheDateEnabled === true
    );
  }

  return (
    mode === "invitation_only" ||
    mode === "both" ||
    preRsvpUpsell?.invitationOnlyEnabled === true
  );
}

function getPreRsvpAlreadySent({
  preRsvpUpsell,
  messageType,
}: {
  preRsvpUpsell: any;
  messageType: PreRsvpMessageType;
}) {
  if (messageType === "save_the_date") {
    return (
      Number(preRsvpUpsell?.saveTheDateSentCount || 0) >= 1 ||
      Boolean(preRsvpUpsell?.saveTheDateSentAt)
    );
  }

  return (
    Number(preRsvpUpsell?.invitationOnlySentCount || 0) >= 1 ||
    Boolean(preRsvpUpsell?.invitationOnlySentAt)
  );
}

function getPreRsvpBlockedMessage({
  preRsvpUpsell,
  messageType,
}: {
  preRsvpUpsell: any;
  messageType: PreRsvpMessageType;
}) {
  if (!preRsvpUpsell?.enabled) {
    return "שירות Save The Date / הזמנה מוקדמת בוואטסאפ לא פתוח בחבילה שלך. ניתן לרכוש את השירות דרך נציג.";
  }

  if (getPreRsvpAlreadySent({ preRsvpUpsell, messageType })) {
    return messageType === "save_the_date"
      ? "הודעת Save The Date כבר נשלחה או תוזמנה בעבר ולכן לא ניתן לשלוח אותה שוב."
      : "הודעת ההזמנה המוקדמת כבר נשלחה או תוזמנה בעבר ולכן לא ניתן לשלוח אותה שוב.";
  }

  return messageType === "save_the_date"
    ? "בחבילה הנוכחית פתוחה רק שליחת הזמנה מוקדמת, ללא Save The Date."
    : "בחבילה הנוכחית פתוח רק Save The Date, ללא שליחת הזמנה מוקדמת.";
}

async function markPreRsvpMessageUsed({
  ownerId,
  messageType,
}: {
  ownerId: string;
  messageType: PreRsvpMessageType;
}) {
  const ownerObjectId = toObjectId(ownerId);

  if (!ownerObjectId) {
    throw new Error("לא נמצא בעלים תקין לעדכון נעילת השליחה.");
  }

  const now = new Date();

  const setData: Record<string, any> = {
    "salesUpsells.preRsvpMessages.sentAt": now,
    "salesUpsells.preRsvpMessages.updatedAt": now,
  };

  const incData: Record<string, number> = {
    "salesUpsells.preRsvpMessages.sentCount": 1,
  };

  if (messageType === "save_the_date") {
    setData["salesUpsells.preRsvpMessages.saveTheDateSentAt"] = now;
    incData["salesUpsells.preRsvpMessages.saveTheDateSentCount"] = 1;
  }

  if (messageType === "invitation_only") {
    setData["salesUpsells.preRsvpMessages.invitationOnlySentAt"] = now;
    incData["salesUpsells.preRsvpMessages.invitationOnlySentCount"] = 1;
  }

  await User.updateOne(
    { _id: ownerObjectId },
    {
      $set: setData,
      $inc: incData,
    }
  );
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

    const saveTheDateTitleFromForm = cleanString(
      formData.get("saveTheDateTitle")
    );

    const invitationTitleFromForm = cleanString(
      formData.get("invitationTitle")
    );

    const eventDateFromForm = cleanString(formData.get("eventDate"));
    const eventLocationFromForm = cleanString(formData.get("eventLocation"));

    const templateMessage = cleanString(formData.get("message"));
    const previewMessage = cleanString(formData.get("previewMessage"));
    const headerImageUrlFromForm = getHighQualityCloudinaryImageUrl(
      formData.get("headerImageUrl")
    );

    const rawTemplateVariables = parseJsonObject(
      formData.get("templateVariables")
    );

    const imageEntry = formData.get("image");
    const imageFile = imageEntry instanceof File ? imageEntry : null;

    if (!invitationId || !isValidObjectId(invitationId)) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאה הזמנה פעילה לשליחה.",
        },
        { status: 400 }
      );
    }

    if (!messageType) {
      return NextResponse.json(
        {
          success: false,
          error: "סוג ההודעה לא תקין.",
        },
        { status: 400 }
      );
    }

    if (!sendTiming) {
      return NextResponse.json(
        {
          success: false,
          error: "סוג התזמון לא תקין.",
        },
        { status: 400 }
      );
    }

    const templateName = getTemplateNameByType(messageType);

    if (templateNameFromClient) {
      if (BLOCKED_RSVP_TEMPLATE_NAMES.has(templateNameFromClient)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "התבנית שנשלחה שייכת לטאב אישורי הגעה ולא לשליחה מוקדמת.",
            expectedTemplateName: templateName,
            receivedTemplateName: templateNameFromClient,
            messageType,
          },
          { status: 400 }
        );
      }

      if (templateNameFromClient !== templateName) {
        return NextResponse.json(
          {
            success: false,
            error: "שם התבנית שנשלח לא תואם לסוג ההודעה המוקדמת.",
            expectedTemplateName: templateName,
            receivedTemplateName: templateNameFromClient,
            messageType,
          },
          { status: 400 }
        );
      }
    }

    if (!imageFile && !headerImageUrlFromForm) {
      return NextResponse.json(
        {
          success: false,
          error:
            "יש להעלות תמונה להודעת הוואטסאפ או להשתמש בתמונת ההזמנה הקיימת.",
        },
        { status: 400 }
      );
    }

    if (headerImageUrlFromForm && !isHttpImageUrl(headerImageUrlFromForm)) {
      return NextResponse.json(
        {
          success: false,
          error: "קישור התמונה אינו תקין.",
        },
        { status: 400 }
      );
    }

    if (imageFile && !imageFile.type.startsWith("image/")) {
      return NextResponse.json(
        {
          success: false,
          error: "סוג הקובץ לא תקין. יש להעלות תמונה בלבד.",
        },
        { status: 400 }
      );
    }

    const maxImageMb = 12;
    const maxImageBytes = maxImageMb * 1024 * 1024;

    if (imageFile && imageFile.size > maxImageBytes) {
      return NextResponse.json(
        {
          success: false,
          error: `התמונה גדולה מדי. ניתן להעלות תמונה עד ${maxImageMb}MB.`,
        },
        { status: 400 }
      );
    }

    const invitation: any = await Invitation.findOne({
      _id: toObjectId(invitationId),
    })
      .select(
        "_id ownerId title eventDate location headerImageUrl finalImageUrl originalImageUrl fullImageUrl cloudinaryUrl secureUrl imageUrl invitationImageUrl canvasImageUrl previewImageUrl previewImage"
      )
      .lean();

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "ההזמנה לא נמצאה.",
        },
        { status: 404 }
      );
    }

    const ownerId = String(invitation.ownerId || "");

    if (!ownerId || !isValidObjectId(ownerId)) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצא בעלים להזמנה.",
        },
        { status: 400 }
      );
    }

    const ownerUser: any = await User.findById(toObjectId(ownerId))
      .select("salesUpsells.preRsvpMessages")
      .lean();

    const preRsvpUpsell = ownerUser?.salesUpsells?.preRsvpMessages;

    const hasPreRsvpAccess = Boolean(preRsvpUpsell?.enabled);
    const messageTypeAllowed = canUsePreRsvpMessageType({
      preRsvpUpsell,
      messageType,
    });
    const preRsvpAlreadySent = getPreRsvpAlreadySent({
      preRsvpUpsell,
      messageType,
    });

    if (!hasPreRsvpAccess || !messageTypeAllowed || preRsvpAlreadySent) {
      return NextResponse.json(
        {
          success: false,
          error: getPreRsvpBlockedMessage({ preRsvpUpsell, messageType }),
        },
        { status: 403 }
      );
    }

    const invitationTitleFromEvent = cleanString(invitation.title);
    const eventDateFromEvent = formatEventDate(invitation.eventDate);
    const eventLocationFromEvent = buildEventLocationFromInvitation(invitation);

    const fallbackSaveTheDateTitle = saveTheDateTitleFromForm;

    const fallbackInvitationTitle =
      invitationTitleFromForm || invitationTitleFromEvent;

    const fallbackEventDate = eventDateFromForm || eventDateFromEvent;

    const fallbackEventLocation =
      eventLocationFromForm || eventLocationFromEvent;

    const templateVariables = buildTemplateVariables({
      messageType,
      rawVariables: rawTemplateVariables,
      fallbackSaveTheDateTitle,
      fallbackInvitationTitle,
      fallbackEventDate,
      fallbackEventLocation,
    });

    console.log("🟢 PRE RSVP TEMPLATE SELECTED:", {
      messageType,
      templateName,
      expected:
        messageType === "save_the_date"
          ? SAVE_THE_DATE_TEMPLATE_NAME
          : EVENT_INVITATION_TEMPLATE_NAME,
      receivedFromClient: templateNameFromClient || null,
    });

    console.log("🟢 PRE RSVP TEMPLATE VARIABLES:", {
      messageType,
      templateName,
      templateVariables,
      fallbackFromInvitation: {
        title: invitationTitleFromEvent,
        eventDate: eventDateFromEvent,
        eventLocation: eventLocationFromEvent,
      },
      fallbackFromForm: {
        saveTheDateTitle: saveTheDateTitleFromForm,
        invitationTitle: invitationTitleFromForm,
        eventDate: eventDateFromForm,
        eventLocation: eventLocationFromForm,
      },
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
          details: {
            templateName,
            messageType,
            templateVariables,
            fromInvitation: {
              title: invitationTitleFromEvent,
              eventDate: eventDateFromEvent,
              eventLocation: eventLocationFromEvent,
            },
            fromForm: {
              saveTheDateTitle: saveTheDateTitleFromForm,
              invitationTitle: invitationTitleFromForm,
              eventDate: eventDateFromForm,
              eventLocation: eventLocationFromForm,
            },
          },
        },
        { status: 400 }
      );
    }

    const fallbackImageUrlFromInvitation = getHighQualityCloudinaryImageUrl(
      invitation.headerImageUrl ||
        invitation.finalImageUrl ||
        invitation.originalImageUrl ||
        invitation.fullImageUrl ||
        invitation.cloudinaryUrl ||
        invitation.secureUrl ||
        invitation.imageUrl ||
        invitation.invitationImageUrl ||
        invitation.canvasImageUrl ||
        invitation.previewImageUrl ||
        invitation.previewImage ||
        ""
    );

    const uploadResult = imageFile
      ? await uploadImageToCloudinary({
          file: imageFile,
          invitationId,
          messageType,
        })
      : null;

    const imageUrl = getHighQualityCloudinaryImageUrl(
      uploadResult?.secureUrl ||
        headerImageUrlFromForm ||
        fallbackImageUrlFromInvitation
    );

    if (!imageUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "לא נמצאה תמונה תקינה לשליחת הוואטסאפ.",
        },
        { status: 400 }
      );
    }

    const cloudinaryPublicId = uploadResult?.publicId || "";

    console.log("🖼️ PRE RSVP FINAL IMAGE:", {
      messageType,
      templateName,
      hasUploadedFile: Boolean(imageFile),
      finalImageUrl: imageUrl,
      cloudinaryPublicId,
    });

    const whatsappPayload = buildWhatsappTemplatePayload({
      messageType,
      imageUrl,
      cloudinaryPublicId,
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
          error: "לא נמצאו מספרי טלפון תקינים לשליחה בוואטסאפ.",
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
            error: "תאריך או שעת השליחה המתוזמנת אינם תקינים.",
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
        userId: toObjectId(ownerId),

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

      await markPreRsvpMessageUsed({
        ownerId,
        messageType,
      });

      return NextResponse.json({
        success: true,
        mode: "scheduled",
        message: "הודעת הוואטסאפ תוזמנה בהצלחה.",
        scheduleId: String(scheduledMessage._id),
        templateName,
        messageType,
        scheduledAt,
        guestsCount: validGuests.length,
        imageUrl,
        cloudinaryPublicId,
        templateVariables,
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

    await markPreRsvpMessageUsed({
      ownerId,
      messageType,
    });

    return NextResponse.json({
      success: true,
      mode: "immediate",
      message: "הודעת הוואטסאפ נוספה לשליחה מיידית.",
      templateName,
      messageType,
      queuedCount: inserted.length,
      guestsCount: validGuests.length,
      imageUrl,
      cloudinaryPublicId,
      templateVariables,
    });
  } catch (err: any) {
    console.error("❌ PRE RSVP WHATSAPP API ERROR:", err);

    if (err?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: "ההודעה כבר קיימת בתור השליחה.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "שליחת הודעת הוואטסאפ נכשלה.",
      },
      { status: 500 }
    );
  }
}