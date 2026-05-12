import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import ScheduledMessage from "@/models/ScheduledMessage";
import WhatsappQueue from "@/models/WhatsappQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= TYPES ================= */

type TemplateName =
  | "rsvp_invitation_media"
  | "rsvp_reminder_invistimo"
  | "table_number_update_invistimo"
  | "table_number_update_with_gift"
  | "thank_you_message";

type MessageType = "rsvp" | "reminder" | "thankyou" | "table" | "custom";
type RoundNumber = 1 | 2 | 3;

type SendTemplateRequestBody = {
  scheduledAt?: string;
  invitationId?: string;
  audience?: string[];
  guestIds?: string[];
  to?: string;
  templateName?: TemplateName;
  languageCode?: string;
  name?: string;
  tableName?: string;
  eventType?: string;
  urlSuffix?: string;
  giftCreditUrl?: string;
  round?: RoundNumber;
  roundNumber?: RoundNumber;
  type?: MessageType;
};

/* ================= AUTH ================= */

async function getAuthUserId() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("authToken")?.value ||
    cookieStore.get("token")?.value ||
    null;

  if (!token) {
    return {
      ok: false as const,
      error: "UNAUTHORIZED",
      status: 401,
    };
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded?.userId || decoded?.id || decoded?._id;

    if (!userId) {
      return {
        ok: false as const,
        error: "INVALID_TOKEN",
        status: 401,
      };
    }

    return {
      ok: true as const,
      userId,
    };
  } catch {
    return {
      ok: false as const,
      error: "INVALID_TOKEN",
      status: 401,
    };
  }
}

/* ================= HELPERS ================= */

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function safeTrim(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isTemplateName(value: unknown): value is TemplateName {
  return (
    value === "rsvp_invitation_media" ||
    value === "rsvp_reminder_invistimo" ||
    value === "table_number_update_invistimo" ||
    value === "table_number_update_with_gift" ||
    value === "thank_you_message"
  );
}

function normalizeRound(value: any, templateName?: TemplateName): RoundNumber {
  const n = Number(value);

  if (n === 2) return 2;
  if (n === 3) return 3;

  if (templateName === "rsvp_reminder_invistimo") {
    return 2;
  }

  return 1;
}

function getTypeByTemplate(templateName: TemplateName): MessageType {
  if (
    templateName === "rsvp_invitation_media" ||
    templateName === "rsvp_reminder_invistimo"
  ) {
    return "rsvp";
  }

  if (
    templateName === "table_number_update_invistimo" ||
    templateName === "table_number_update_with_gift"
  ) {
    return "reminder";
  }

  if (templateName === "thank_you_message") {
    return "thankyou";
  }

  return "custom";
}

function getRsvpScheduledField(round: RoundNumber) {
  return `rsvpWhatsappRound${round}ScheduledAt`;
}

function getRsvpSentField(round: RoundNumber) {
  return `rsvpWhatsappRound${round}SentAt`;
}

function getGenericRsvpSentField(round: RoundNumber) {
  return `rsvpRound${round}SentAt`;
}

function getRsvpLockField(round: RoundNumber) {
  return `messageLocks.rsvpWhatsappRound${round}`;
}

function cleanAddress(address?: string): string {
  if (!address) return "";

  return address
    .replace(/,?\s*ישראל/gi, "")
    .replace(/\b\d{5,7}\b/g, "")
    .replace(/,+/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/,$/, "");
}

function formatEventDateTime(dateString?: string, timeString?: string): string {
  if (!dateString) return "";

  const date = new Date(dateString);

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  const formattedDate = `${dd}.${mm}.${yyyy}`;

  if (!timeString) return formattedDate;

  return `${formattedDate} ${timeString}`;
}

function normalizePhone(phoneRaw: any) {
  let phone = String(phoneRaw || "").replace(/\D/g, "");

  if (!phone) return "";

  if (phone.startsWith("0")) {
    phone = "972" + phone.slice(1);
  } else if (!phone.startsWith("972")) {
    phone = "972" + phone;
  }

  return phone;
}

function buildGuestQuery({
  invitationId,
  type,
  round,
  audience,
}: {
  invitationId: string;
  type: MessageType;
  round: RoundNumber;
  audience: string[];
}) {
  if (type === "rsvp") {
    if (round === 1) {
      return { invitationId };
    }

    return {
      invitationId,
      rsvp: "pending",
    };
  }

  if (Array.isArray(audience) && audience.length > 0) {
    return {
      invitationId,
      _id: { $in: audience },
    };
  }

  return { invitationId };
}

function buildPayloadTemplate({
  templateName,
  languageCode,
  invitation,
}: {
  templateName: TemplateName;
  languageCode: string;
  invitation: any;
}) {
  const eventDate = formatEventDateTime(
    invitation.eventDate,
    invitation.eventTime
  );

  const eventLocation = cleanAddress(invitation.location?.address);

  /**
   * חשוב:
   * כאן שומרים placeholders.
   * ה-worker מחליף אותם בזמן השליחה בפועל.
   * כך RSVP / שולחן / ניווט / שם אורח נשארים עדכניים.
   */
  const basePayload: any = {
    languageCode,
    eventTitle: invitation.title || "",
    eventDate,
    eventLocation,
    headerImageUrl: invitation.headerImageUrl || "",
    rsvpLink: "{{rsvpLink}}",
    name: "{{name}}",
    tableName: "{{tableName}}",
    navigationLink: "{{navigationLink}}",
  };

  /**
   * אם ה-worker שלך שולח לפי payload.components,
   * זה נותן לו מבנה מוכן. אם יש לך מבנה תבנית שונה במטא,
   * נשנה את components לפי התבנית המדויקת שלך.
   */
  if (
    templateName === "rsvp_invitation_media" ||
    templateName === "rsvp_reminder_invistimo"
  ) {
    basePayload.components = [
      ...(invitation.headerImageUrl
        ? [
            {
              type: "header",
              parameters: [
                {
                  type: "image",
                  image: {
                    link: invitation.headerImageUrl,
                  },
                },
              ],
            },
          ]
        : []),
      {
        type: "body",
        parameters: [
          { type: "text", text: invitation.title || "" },
          { type: "text", text: eventDate },
          { type: "text", text: eventLocation },
        ],
      },
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [{ type: "text", text: "{{urlSuffix}}" }],
      },
    ];
  }

  if (
    templateName === "table_number_update_invistimo" ||
    templateName === "table_number_update_with_gift"
  ) {
    basePayload.components = [
      {
        type: "body",
        parameters: [
          { type: "text", text: "{{name}}" },
          { type: "text", text: "{{tableName}}" },
          { type: "text", text: "{{navigationLink}}" },
        ],
      },
    ];
  }

  if (templateName === "thank_you_message") {
    basePayload.components = [
      {
        type: "body",
        parameters: [{ type: "text", text: "{{name}}" }],
      },
    ];
  }

  return basePayload;
}

/* ================= ROUTE ================= */

export async function POST(req: NextRequest) {
  try {
    await db();

    const auth = await getAuthUserId();

    if (!auth.ok) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error,
        },
        { status: auth.status }
      );
    }

    const body = (await req.json()) as Partial<SendTemplateRequestBody>;

    const scheduledAtRaw = body.scheduledAt;

    if (!isTemplateName(body.templateName)) {
      return NextResponse.json(
        { success: false, error: "INVALID_TEMPLATE" },
        { status: 400 }
      );
    }

    const templateName = body.templateName;
    const languageCode = safeTrim(body.languageCode) || "he";
    const type = body.type || getTypeByTemplate(templateName);

    const round = normalizeRound(
      body.round ?? body.roundNumber,
      templateName
    );

    const invitationId = String(body.invitationId || "");

    if (
      !isNonEmptyString(invitationId) ||
      !mongoose.Types.ObjectId.isValid(invitationId)
    ) {
      return NextResponse.json(
        { success: false, error: "INVALID_INVITATION_ID" },
        { status: 400 }
      );
    }

    const invitation: any = await Invitation.findOne({
      _id: invitationId,
      ownerId: auth.userId,
    }).populate("eventId");

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const audience = Array.isArray(body.audience)
      ? body.audience.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : Array.isArray(body.guestIds)
      ? body.guestIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : [];

    const guestQuery = buildGuestQuery({
      invitationId,
      type,
      round,
      audience,
    });

    const guestsCount = await InvitationGuest.countDocuments(guestQuery);

    const payload = buildPayloadTemplate({
      templateName,
      languageCode,
      invitation,
    });

    /* ======================================================
       BLOCKS — רק לפי שליחה בפועל, לא לפי scheduledAt
    ====================================================== */

    if (type === "rsvp") {
      const sentField = getRsvpSentField(round);
      const genericSentField = getGenericRsvpSentField(round);
      const lockFieldName = `rsvpWhatsappRound${round}`;

      const alreadySent =
        ((invitation as any)[sentField] ||
          (invitation as any)[genericSentField]) &&
        (invitation as any).messageLocks?.[lockFieldName];

      if (alreadySent) {
        return NextResponse.json(
          {
            success: false,
            error: `RSVP_ROUND${round}_ALREADY_SENT`,
          },
          { status: 400 }
        );
      }
    }

    if (type === "reminder" || type === "table") {
      const reminderAlready =
        invitation.reminderSentAt &&
        invitation.messageLocks?.reminderWhatsapp;

      if (reminderAlready) {
        return NextResponse.json(
          { success: false, error: "REMINDER_ALREADY_SENT" },
          { status: 400 }
        );
      }
    }

    if (type === "thankyou" || type === "custom") {
      const thankyouAlready =
        invitation.thankYouSentAt &&
        invitation.messageLocks?.thankyouWhatsapp;

      if (thankyouAlready) {
        return NextResponse.json(
          { success: false, error: "THANKYOU_ALREADY_SENT" },
          { status: 400 }
        );
      }
    }

    /* ======================================================
       SCHEDULE
       תזמון נשמר רק ב-ScheduledMessage.
       לא יוצרים Queue מראש.
       לא מעדכנים SentAt.
       לא נועלים messageLocks.
    ====================================================== */

    if (scheduledAtRaw) {
      const scheduledAt = new Date(scheduledAtRaw);

      if (Number.isNaN(scheduledAt.getTime())) {
        return NextResponse.json(
          { success: false, error: "INVALID_SCHEDULED_AT" },
          { status: 400 }
        );
      }

      if (scheduledAt.getTime() <= Date.now()) {
        return NextResponse.json(
          { success: false, error: "SCHEDULED_AT_MUST_BE_FUTURE" },
          { status: 400 }
        );
      }

      const existingSchedule = await ScheduledMessage.findOne({
        invitationId,
        userId: auth.userId,
        type,
        channel: "whatsapp",
        round,
        status: "scheduled",
      });

      const schedulePayload = {
  invitationId,
  userId: auth.userId,

  channel: "whatsapp",
  type,
  filter: type === "rsvp" ? (round === 1 ? "all" : "pending") : "all",

  templateKey:
    type === "rsvp"
      ? "rsvp"
      : type === "reminder" || type === "table"
      ? "reminder"
      : type === "thankyou"
      ? "thankyou"
      : "custom",

  round,
  roundNumber: round,

  templateName,
  payload,

  // ✅ חובה כי ScheduledMessage דורש messageContent
  // ב-WhatsApp מקור האמת הוא payload/templateName, לא טקסט חופשי
  messageContent: `whatsapp:${templateName}`,
  messageOverride: `whatsapp:${templateName}`,
  text: `whatsapp:${templateName}`,

  includeGiftLink: !!body.giftCreditUrl,
  giftLink: body.giftCreditUrl || null,

  guestIds: type === "rsvp" ? [] : audience,

  scheduledAt,
  guestsCount,
  status: "scheduled",

  sentCount: 0,
  lockedAt: null,
  lockedBy: null,
  cancelledAt: null,
  error: "",
};
      let schedule;

      if (existingSchedule) {
        existingSchedule.set(schedulePayload);
        schedule = await existingSchedule.save();
      } else {
        schedule = await ScheduledMessage.create(schedulePayload);
      }

      if (type === "rsvp") {
        const scheduledField = getRsvpScheduledField(round);

        await Invitation.updateOne(
          { _id: invitation._id },
          {
            $set: {
              [scheduledField]: scheduledAt,
            },
          }
        );
      }

      return NextResponse.json({
        success: true,
        scheduled: true,
        mode: existingSchedule ? "updated" : "created",
        schedule,
        guestsCount,
      });
    }

    /* ======================================================
       IMMEDIATE SEND
       כאן לא מתזמנים.
       יוצרים WhatsAppQueue לשליחה מיידית.
       רק אחרי זה מסמנים שהסבב נכנס לשליחה בפועל.
    ====================================================== */

    const guests = await InvitationGuest.find(guestQuery);

    const queueDocs: any[] = [];
    const batchId = new Date().getTime();

    for (const guest of guests) {
      if (!guest.phone || !guest.token) continue;

      const phone = normalizePhone(guest.phone);
      if (!phone) continue;

      const tableName =
        typeof guest.tableNumber === "number"
          ? `שולחן ${guest.tableNumber}`
          : guest.tableName || "";

      const urlSuffix = `invite/${invitation.shareId}?token=${guest.token}`;

      const guestPayload = JSON.parse(JSON.stringify(payload));

      guestPayload.name = guest.name || "";
      guestPayload.tableName = tableName;
      guestPayload.rsvpLink = `https://www.invistimo.com/${urlSuffix}`;
      guestPayload.urlSuffix = urlSuffix;

      if (Array.isArray(guestPayload.components)) {
        guestPayload.components = JSON.parse(
          JSON.stringify(guestPayload.components)
            .replace(/{{name}}/g, guest.name || "")
            .replace(/{{tableName}}/g, tableName)
            .replace(/{{urlSuffix}}/g, urlSuffix)
            .replace(
              /{{rsvpLink}}/g,
              `https://www.invistimo.com/${urlSuffix}`
            )
        );
      }

      queueDocs.push({
        invitationId: invitation._id,
        guestId: guest._id,
        scheduleId: null,

        channel: "whatsapp",
        type,
        round,
        roundNumber: round,

        phone,
        templateName,
        idempotencyKey: [
          "whatsapp",
          "immediate",
          type,
          String(invitation._id),
          String(round),
          String(guest._id),
          String(batchId),
          templateName,
        ].join(":"),

        payload: guestPayload,

        status: "pending",
        scheduledAt: null,
        attempts: 0,
        maxAttempts: 3,
      });
    }

    if (queueDocs.length > 0) {
      await WhatsappQueue.insertMany(queueDocs, {
        ordered: false,
      });
    }

    if (queueDocs.length > 0) {
      if (type === "rsvp") {
        const sentField = getRsvpSentField(round);
        const genericSentField = getGenericRsvpSentField(round);
        const lockField = getRsvpLockField(round);
        const scheduledField = getRsvpScheduledField(round);

        await Invitation.updateOne(
          {
            _id: invitation._id,
            [sentField]: { $in: [null, undefined] },
          },
          {
            $set: {
              [sentField]: new Date(),
              [genericSentField]: new Date(),
              [lockField]: true,
            },
            $unset: {
              [scheduledField]: "",
            },
          }
        );
      }

      if (type === "reminder" || type === "table") {
        await Invitation.updateOne(
          { _id: invitation._id, reminderSentAt: { $in: [null, undefined] } },
          {
            $set: {
              reminderSentAt: new Date(),
              "messageLocks.reminderWhatsapp": true,
            },
          }
        );
      }

      if (type === "thankyou" || type === "custom") {
        await Invitation.updateOne(
          { _id: invitation._id, thankYouSentAt: { $in: [null, undefined] } },
          {
            $set: {
              thankYouSentAt: new Date(),
              "messageLocks.thankyouWhatsapp": true,
            },
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      queued: queueDocs.length,
      sent: queueDocs.length,
    });
  } catch (error: any) {
    console.error("❌ WHATSAPP SEND ERROR:", error?.message || error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "SEND_FAILED",
      },
      { status: 500 }
    );
  }
}