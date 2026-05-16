import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import "@/models/Event";
import db from "@/lib/db";

import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import ScheduledMessage from "@/models/ScheduledMessage";
import WhatsappQueue from "@/models/WhatsappQueue";
import User from "@/models/User";

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

function normalizeAllowedMessageRounds(value: any): 2 | 3 {
  return Number(value) === 3 ? 3 : 2;
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

    const round = normalizeRound(body.round ?? body.roundNumber, templateName);

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

    if (type === "rsvp" && round === 3) {
      const authUser = await User.findById(auth.userId)
        .select("allowedMessageRounds planLimits email name role")
        .lean();

      const ownerUser = await User.findById(invitation.ownerId)
        .select("allowedMessageRounds planLimits email name role")
        .lean();

      const authAllowedMessageRounds = normalizeAllowedMessageRounds(
        authUser?.allowedMessageRounds ||
          authUser?.planLimits?.allowedMessageRounds ||
          2
      );

      const ownerAllowedMessageRounds = normalizeAllowedMessageRounds(
        ownerUser?.allowedMessageRounds ||
          ownerUser?.planLimits?.allowedMessageRounds ||
          2
      );

      const allowedMessageRounds: 2 | 3 =
        authAllowedMessageRounds === 3 || ownerAllowedMessageRounds === 3
          ? 3
          : 2;

      console.log("WHATSAPP ROUND 3 PERMISSION CHECK:", {
        authUserId: String(auth.userId),
        invitationOwnerId: String(invitation.ownerId),
        authUserEmail: authUser?.email || null,
        ownerUserEmail: ownerUser?.email || null,
        authAllowedMessageRounds: authUser?.allowedMessageRounds || null,
        authPlanLimitsAllowedMessageRounds:
          authUser?.planLimits?.allowedMessageRounds || null,
        ownerAllowedMessageRounds: ownerUser?.allowedMessageRounds || null,
        ownerPlanLimitsAllowedMessageRounds:
          ownerUser?.planLimits?.allowedMessageRounds || null,
        finalAllowedMessageRounds: allowedMessageRounds,
      });

      if (allowedMessageRounds < 3) {
        return NextResponse.json(
          {
            success: false,
            blocked: true,
            error: "סבב 3 לא פתוח בחבילה של הלקוח",
            message: "סבב 3 לא פתוח בחבילה של הלקוח.",
            round,
            allowedMessageRounds,
            debug: {
              authUserId: String(auth.userId),
              invitationOwnerId: String(invitation.ownerId),
              authUserEmail: authUser?.email || null,
              ownerUserEmail: ownerUser?.email || null,
              authAllowedMessageRounds: authUser?.allowedMessageRounds || null,
              authPlanLimitsAllowedMessageRounds:
                authUser?.planLimits?.allowedMessageRounds || null,
              ownerAllowedMessageRounds:
                ownerUser?.allowedMessageRounds || null,
              ownerPlanLimitsAllowedMessageRounds:
                ownerUser?.planLimits?.allowedMessageRounds || null,
              finalAllowedMessageRounds: allowedMessageRounds,
            },
          },
          { status: 403 }
        );
      }
    }

    const audience = Array.isArray(body.audience)
      ? body.audience.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : Array.isArray(body.guestIds)
      ? body.guestIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : [];

    if (type === "rsvp") {
      const roundKey = `round${round}`;
      const roundData = invitation.rsvpRoundSent?.[roundKey];

      const alreadySent = Boolean(
        roundData?.sentAt ||
          roundData?.sentAtSms ||
          roundData?.sentAtWhatsapp ||
          roundData?.smsSentAt ||
          roundData?.whatsappSentAt ||
          invitation.adminMessageRoundLocks?.[`rsvp_${round}`]
      );

      if (alreadySent) {
        return NextResponse.json(
          {
            success: false,
            blocked: true,
            error: "RSVP_ROUND_ALREADY_SENT",
            message: `סבב ${round} כבר נשלח בפועל ולכן חסום לשליחה נוספת בכל הערוצים.`,
            round,
          },
          { status: 409 }
        );
      }
    }

    if (type === "reminder" || type === "table") {
      const reminderAlready = Boolean(invitation.reminderSentAt);

      if (reminderAlready) {
        return NextResponse.json(
          { success: false, error: "REMINDER_ALREADY_SENT" },
          { status: 409 }
        );
      }
    }

    if (type === "thankyou" || type === "custom") {
      const thankyouAlready = Boolean(invitation.thankYouSentAt);

      if (thankyouAlready) {
        return NextResponse.json(
          { success: false, error: "THANKYOU_ALREADY_SENT" },
          { status: 409 }
        );
      }
    }

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
        channel: "whatsapp",
        type,
        round,
        templateName,
        status: { $in: ["scheduled", "pending"] },
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
        updatedAt: new Date(),
      };

      let schedule;

      if (existingSchedule) {
        existingSchedule.set(schedulePayload);
        schedule = await existingSchedule.save();
      } else {
        schedule = await ScheduledMessage.create(schedulePayload);
      }

      const invitationSchedulePatch: Record<string, any> = {
        updatedAt: new Date(),
      };

      if (type === "rsvp") {
        const scheduledField = getRsvpScheduledField(round);
        invitationSchedulePatch[scheduledField] = scheduledAt;
      }

      if (type === "reminder" || type === "table") {
        invitationSchedulePatch.reminderScheduledAt = scheduledAt;
      }

      if (type === "thankyou") {
        invitationSchedulePatch.thankYouScheduledAt = scheduledAt;
      }

      await Invitation.updateOne(
        { _id: invitation._id },
        {
          $set: invitationSchedulePatch,
        }
      );

      return NextResponse.json({
        success: true,
        scheduled: true,
        mode: existingSchedule ? "updated" : "created",
        schedule,
        guestsCount,
      });
    }

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
      const now = new Date();

      if (type === "rsvp") {
        const scheduledField = getRsvpScheduledField(round);

        const markResult = await Invitation.collection.updateOne(
          { _id: invitation._id },
          {
            $set: {
              [`rsvpRoundSent.round${round}`]: {
                channel: "whatsapp",
                sentAt: now,
                sentCount: queueDocs.length,
              },
              updatedAt: now,
            },
            $unset: {
              [scheduledField]: "",
            },
          }
        );

        console.log("✅ RSVP WHATSAPP ROUND MARKED SENT:", {
          invitationId: String(invitation._id),
          round,
          queued: queueDocs.length,
          matchedCount: markResult.matchedCount,
          modifiedCount: markResult.modifiedCount,
        });
      }

      if (type === "reminder" || type === "table") {
        const markResult = await Invitation.collection.updateOne(
          { _id: invitation._id },
          {
            $set: {
              reminderSentAt: now,
              updatedAt: now,
            },
            $unset: {
              reminderScheduledAt: "",
            },
          }
        );

        console.log("✅ REMINDER WHATSAPP ROUND MARKED SENT:", {
          invitationId: String(invitation._id),
          queued: queueDocs.length,
          matchedCount: markResult.matchedCount,
          modifiedCount: markResult.modifiedCount,
        });
      }

      if (type === "thankyou" || type === "custom") {
        const markResult = await Invitation.collection.updateOne(
          { _id: invitation._id },
          {
            $set: {
              thankYouSentAt: now,
              updatedAt: now,
            },
            $unset: {
              thankYouScheduledAt: "",
            },
          }
        );

        console.log("✅ THANKYOU WHATSAPP ROUND MARKED SENT:", {
          invitationId: String(invitation._id),
          queued: queueDocs.length,
          matchedCount: markResult.matchedCount,
          modifiedCount: markResult.modifiedCount,
        });
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