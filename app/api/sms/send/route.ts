import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import ScheduledMessage from "@/models/ScheduledMessage";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { shortenUrl } from "@/lib/shortenUrl";

/* ======================================================
   TYPES
====================================================== */

type MessageTemplateKey =
  | "rsvp"
  | "table"
  | "custom"
  | "reminder"
  | "thankyou";

type ScheduledType =
  | "rsvp"
  | "reminder"
  | "thankyou"
  | "table"
  | "custom";

type FilterType = "all" | "pending" | "withTable";
type RoundNumber = 1 | 2 | 3;

/* ======================================================
   SMS PARTS
====================================================== */

function countBusinessSms(text: string) {
  const length = [...text].length;

  if (length <= 200) return 1;
  if (length <= 320) return 2;

  return -1;
}

/* ======================================================
   HELPERS
====================================================== */

function normalizeRound(value: any): RoundNumber {
  const n = Number(value);

  if (n === 2) return 2;
  if (n === 3) return 3;

  return 1;
}

function normalizeTemplateKey(value: any): MessageTemplateKey {
  if (
    value === "rsvp" ||
    value === "table" ||
    value === "custom" ||
    value === "reminder" ||
    value === "thankyou"
  ) {
    return value;
  }

  return "custom";
}

function getScheduledType(templateKey: MessageTemplateKey): ScheduledType {
  if (templateKey === "rsvp") return "rsvp";
  if (templateKey === "table") return "reminder";
  if (templateKey === "reminder") return "reminder";
  if (templateKey === "thankyou") return "thankyou";
  if (templateKey === "custom") return "thankyou";

  return "custom";
}

function getFilterForSend({
  templateKey,
  round,
  filter,
}: {
  templateKey: MessageTemplateKey;
  round: RoundNumber;
  filter: FilterType;
}): FilterType {
  if (templateKey === "rsvp") {
    return round === 1 ? "all" : "pending";
  }

  return filter;
}

function getRsvpScheduledField(round: RoundNumber) {
  return `rsvpSmsRound${round}ScheduledAt`;
}

function getRsvpSentField(round: RoundNumber) {
  return `rsvpSmsRound${round}SentAt`;
}

function getGenericRsvpSentField(round: RoundNumber) {
  return `rsvpRound${round}SentAt`;
}

function getRsvpLockField(round: RoundNumber) {
  return `messageLocks.rsvpSmsRound${round}`;
}

function buildGuestQuery({
  invitationId,
  templateKey,
  round,
  filter,
  guestIds,
}: {
  invitationId: string;
  templateKey: MessageTemplateKey;
  round: RoundNumber;
  filter: FilterType;
  guestIds?: string[];
}) {
  /**
   * חשוב:
   * באישורי הגעה השרת קובע את הקהל לפי הסבב.
   * סבב 1 = כולם
   * סבב 2/3 = מי שעדיין pending בזמן השליחה בפועל.
   *
   * לכן לא משתמשים ב-guestIds כמקור אמת ב-RSVP.
   */
  if (templateKey === "rsvp") {
    if (round === 1) {
      return { invitationId };
    }

    return {
      invitationId,
      rsvp: "pending",
    };
  }

  /**
   * הודעות אחרות:
   * אפשר לכבד בחירת guestIds אם הגיעה מהפרונט.
   */
  if (Array.isArray(guestIds) && guestIds.length > 0) {
    return {
      _id: { $in: guestIds },
      invitationId,
    };
  }

  const query: any = { invitationId };

  if (filter === "pending") {
    query.rsvp = "pending";
  }

  if (filter === "withTable") {
    query.$or = [
      { tableName: { $exists: true, $ne: "" } },
      { tableNumber: { $ne: null } },
    ];
  }

  return query;
}

/* ======================================================
   MESSAGE TEMPLATES – SERVER SOURCE OF TRUTH
====================================================== */

const MESSAGE_TEMPLATES: Record<
  MessageTemplateKey,
  {
    requiresTable?: boolean;
    round1?: string;
    round2?: string;
    round3?: string;
    content?: string;
  }
> = {
  rsvp: {
    round1:
      "היי {{name}},\n" +
      "נשמח לדעת אם תגיעו ל־{{invitationTitle}} 🎉\n\n" +
      "לאישור הגעה לחצו כאן:\n" +
      "{{rsvpLink}}\n\n" +
      "מחכים לכם באהבה 💖",

    round2:
      "היי {{name}},\n" +
      "תזכורת קצרה לאישור הגעה ל־{{invitationTitle}} 🎉\n\n" +
      "לאישור לחצו כאן:\n" +
      "{{rsvpLink}}\n\n" +
      "מחכים לכם 💖",

    round3:
      "היי {{name}},\n" +
      "תזכורת אחרונה לאישור הגעה ל־{{invitationTitle}} 🎉\n\n" +
      "עדיין לא קיבלנו מענה.\n" +
      "לאישור הגעה לחצו כאן:\n" +
      "{{rsvpLink}}\n\n" +
      "נשמח לעדכון 💖",
  },

  table: {
    requiresTable: false,
    content:
      "היי {{name}} 🌸 שמחים לראות אותך 💛\n" +
      "מספר השולחן שלך באירוע:\n" +
      "🪑 {{tableName}}\n\n" +
      "ניווט לאירוע:\n" +
      "{{navigationLink}}\n\n" +
      "מחכים לך!",
  },

  reminder: {
    requiresTable: false,
    content:
      "היי {{name}} 🌸 שמחים לראות אותך 💛\n" +
      "מספר השולחן שלך באירוע:\n" +
      "🪑 {{tableName}}\n\n" +
      "ניווט לאירוע:\n" +
      "{{navigationLink}}\n\n" +
      "מחכים לך!",
  },

  custom: {
    content:
      "היי {{name}} 🌸\n" +
      "שמחנו לראותכם באירוע.\n" +
      "תודה שהשתתפתם בשמחתנו.",
  },

  thankyou: {
    content:
      "היי {{name}} 🌸\n" +
      "שמחנו לראותכם באירוע.\n" +
      "תודה שהשתתפתם בשמחתנו.",
  },
};

/* ======================================================
   POST
====================================================== */

export async function POST(req: Request) {
  try {
    await dbConnect();

    /* ================= AUTH ================= */

    const cookieStore = await cookies();

    const token =
      cookieStore.get("authToken")?.value ||
      cookieStore.get("token")?.value ||
      null;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json(
        { success: false, error: "INVALID_TOKEN" },
        { status: 401 }
      );
    }

    const userId = decoded?.userId || decoded?.id || decoded?._id;

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 401 }
      );
    }

    const usesNewLogic = user.isActive === false;

    /* ================= BALANCE ================= */

    const remainingMessages = Math.max(
      (typeof user.maxMessages === "number" ? user.maxMessages : 0) -
        (typeof user.smsUsed === "number" ? user.smsUsed : 0),
      0
    );

    /* ================= BODY ================= */

    const body = (await req.json()) as {
      invitationId?: string;
      filter?: FilterType;
      templateKey?: MessageTemplateKey;
      type?: ScheduledType;
      scheduledAt?: string;
      includeGiftLink?: boolean;
      giftLink?: string;
      messageOverride?: string;
      messageContent?: string;
      message?: string;
      text?: string;
      guestIds?: string[];
      audience?: string[];
      round?: RoundNumber;
      roundNumber?: RoundNumber;
    };

    const invitationId = body.invitationId;
    const templateKey = normalizeTemplateKey(body.templateKey || body.type);
    const round = normalizeRound(body.round ?? body.roundNumber);
    const rawFilter = body.filter || "all";
    const filter = getFilterForSend({
      templateKey,
      round,
      filter: rawFilter,
    });

    const scheduledType = getScheduledType(templateKey);

    const scheduledAt = body.scheduledAt;
    const includeGiftLink = !!body.includeGiftLink;
    const giftLink = body.giftLink || "";

    const guestIds = Array.isArray(body.guestIds)
      ? body.guestIds
      : Array.isArray(body.audience)
      ? body.audience
      : [];

    if (!invitationId || !templateKey) {
      return NextResponse.json(
        { success: false, error: "MISSING_PARAMS" },
        { status: 400 }
      );
    }

    const template = MESSAGE_TEMPLATES[templateKey];

    if (!template) {
      return NextResponse.json(
        { success: false, error: "INVALID_TEMPLATE" },
        { status: 400 }
      );
    }

    const baseTemplateText =
      body.messageOverride?.trim() ||
      body.messageContent?.trim() ||
      body.message?.trim() ||
      body.text?.trim() ||
      (templateKey === "rsvp"
        ? round === 3
          ? template.round3 ?? template.round2 ?? ""
          : round === 2
          ? template.round2 ?? ""
          : template.round1 ?? ""
        : template.content ?? "");

    /* ================= INVITATION ================= */

    const invitation = await Invitation.findById(invitationId).lean();

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "INVITATION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const invitationTitle = invitation.title?.trim() || "האירוע שלנו";

    /* ======================================================
       BLOCKS — only sent locks, not scheduled
    ====================================================== */

    if (templateKey === "rsvp") {
      const sentField = getRsvpSentField(round);
      const genericSentField = getGenericRsvpSentField(round);
      const lockFieldName = `rsvpSmsRound${round}`;

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

    if (templateKey === "table" || templateKey === "reminder") {
      const reminderAlready =
        invitation.reminderSentAt && invitation.messageLocks?.reminderSms;

      if (reminderAlready) {
        return NextResponse.json(
          {
            success: false,
            error: "REMINDER_ALREADY_SENT",
          },
          { status: 400 }
        );
      }
    }

    if (templateKey === "custom" || templateKey === "thankyou") {
      const thankyouAlready =
        invitation.thankYouSentAt && invitation.messageLocks?.thankyouSms;

      if (thankyouAlready) {
        return NextResponse.json(
          {
            success: false,
            error: "THANKYOU_ALREADY_SENT",
          },
          { status: 400 }
        );
      }
    }

    if (!usesNewLogic && remainingMessages <= 0) {
      return NextResponse.json(
        { success: false, error: "SMS_LIMIT_REACHED" },
        { status: 403 }
      );
    }

    /* ================= LOCATION / NAVIGATION ================= */

    const location = invitation.location;

    const hasLocation =
      typeof location?.lat === "number" && typeof location?.lng === "number";

    let navigationLink = "";

    if (hasLocation) {
      const wazeUrl = `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`;
      navigationLink = await shortenUrl(wazeUrl);
    }

    /* ================= QUERY ================= */

    const guestsQuery = buildGuestQuery({
      invitationId,
      templateKey,
      round,
      filter,
      guestIds,
    });

    /* ======================================================
       SCHEDULE
       חשוב:
       לא קובעים קהל סופי בזמן התזמון.
       לא מעדכנים SentAt.
       לא נועלים messageLocks.
    ====================================================== */

    if (scheduledAt) {
      const scheduleDate = new Date(scheduledAt);

      if (Number.isNaN(scheduleDate.getTime())) {
        return NextResponse.json(
          { success: false, error: "INVALID_SCHEDULED_AT" },
          { status: 400 }
        );
      }

      if (scheduleDate.getTime() <= Date.now()) {
        return NextResponse.json(
          { success: false, error: "SCHEDULED_AT_MUST_BE_FUTURE" },
          { status: 400 }
        );
      }

      /**
       * guestsCount הוא הערכה להצגה בלבד.
       * ה-worker ישלוף מחדש בזמן השליחה בפועל.
       */
      const guestsCount = await InvitationGuest.countDocuments(guestsQuery);

      let previewContent = baseTemplateText
        .replace(/{{name}}/g, "שם מלא לדוגמה ארוך מאוד")
        .replace(/{{invitationTitle}}/g, invitationTitle)
        .replace(/{{rsvpLink}}/g, "https://example.com/very-long-link")
        .replace(/{{tableName}}/g, "שולחן 123")
        .replace(/{{navigationLink}}/g, navigationLink || "{{navigationLink}}");

      if (includeGiftLink && giftLink) {
        previewContent += `\n\n🎁 למתנה באשראי:\n${giftLink}`;
      }

      const partsPerMessage = countBusinessSms(previewContent);

      if (partsPerMessage === -1) {
        return NextResponse.json(
          {
            success: false,
            error: "MESSAGE_TOO_LONG",
            maxParts: 2,
            totalChars: [...previewContent].length,
          },
          { status: 400 }
        );
      }

      const totalMessagesToCharge = guestsCount * partsPerMessage;

      if (!usesNewLogic && totalMessagesToCharge > remainingMessages) {
        return NextResponse.json(
          {
            success: false,
            error: "SMS_LIMIT_REACHED",
            required: totalMessagesToCharge,
            remaining: remainingMessages,
          },
          { status: 403 }
        );
      }

      /**
       * שומרים תבנית עם placeholders.
       * בתזכורת/שולחן ה-worker יבנה שוב בזמן השליחה בפועל,
       * כדי שמספר שולחן עדכני ייכנס להודעה.
       */
      let messageContent = baseTemplateText
        .replace(/{{name}}/g, "{{name}}")
        .replace(/{{invitationTitle}}/g, invitationTitle)
        .replace(/{{rsvpLink}}/g, "{{rsvpLink}}")
        .replace(/{{tableName}}/g, "{{tableName}}")
        .replace(/{{navigationLink}}/g, "{{navigationLink}}");

      if (includeGiftLink && giftLink) {
        messageContent += `\n\n🎁 למתנה באשראי:\n${giftLink}`;
      }

      /**
       * אם קיים כבר תזמון פעיל לאותו דבר בדיוק:
       * אותה הזמנה + אותו סוג + אותו ערוץ + אותו סבב
       * מעדכנים אותו.
       *
       * זה עדיין מאפשר במקביל:
       * RSVP round 1
       * RSVP round 2
       * RSVP round 3
       * reminder
       * thankyou
       */
      const existingSchedule = await ScheduledMessage.findOne({
        invitationId,
        userId: user._id,
        type: scheduledType,
        channel: "sms",
        round,
        status: "scheduled",
      });

      const payload = {
        invitationId,
        userId: user._id,

        channel: "sms",
        type: scheduledType,
        filter,

        templateKey:
          templateKey === "reminder"
            ? "reminder"
            : templateKey === "thankyou"
            ? "thankyou"
            : templateKey,

        scheduledAt: scheduleDate,
        guestsCount,
        status: "scheduled",

        includeGiftLink,
        giftLink: giftLink || null,

        messageContent,
        messageOverride: baseTemplateText,
        text: messageContent,

        /**
         * RSVP לא שומר guestIds כמקור אמת.
         * הודעות אחרות יכולות לשמור אם נבחרו.
         */
        guestIds: templateKey === "rsvp" ? [] : guestIds,

        round,
        roundNumber: round,

        sentCount: 0,
        lockedAt: null,
        lockedBy: null,
        cancelledAt: null,
        error: "",
      };

      let schedule;

      if (existingSchedule) {
        existingSchedule.set(payload);
        schedule = await existingSchedule.save();
      } else {
        schedule = await ScheduledMessage.create(payload);
      }

      if (templateKey === "rsvp") {
        const scheduledField = getRsvpScheduledField(round);

        await Invitation.updateOne(
          { _id: invitationId },
          {
            $set: {
              [scheduledField]: scheduleDate,
            },
          }
        );
      }

      return NextResponse.json({
        success: true,
        scheduled: true,
        schedule,
        mode: existingSchedule ? "updated" : "created",
        guestsCount,
      });
    }

    /* ======================================================
       SEND NOW
       כאן כן שולחים בפועל ולכן רק כאן מסמנים SentAt + lock.
    ====================================================== */

    const guests = await InvitationGuest.find(guestsQuery).lean();

    const baseMessage = baseTemplateText
      .replace(/{{name}}/g, "{{name}}")
      .replace(/{{invitationTitle}}/g, invitationTitle)
      .replace(/{{rsvpLink}}/g, "{{rsvpLink}}")
      .replace(/{{tableName}}/g, "{{tableName}}")
      .replace(/{{navigationLink}}/g, navigationLink);

    if (!guests.length) {
      return NextResponse.json({
        success: true,
        sent: 0,
        partsPerMessage: 0,
        charged: 0,
      });
    }

    let totalPartsSent = 0;
    let sent = 0;

    const BATCH_SIZE = 150;

    for (let i = 0; i < guests.length; i += BATCH_SIZE) {
      const batch = guests.slice(i, i + BATCH_SIZE);

      const tasks = batch.map(async (freshGuest) => {
        if (
          template.requiresTable &&
          !freshGuest.tableName &&
          typeof freshGuest.tableNumber !== "number"
        ) {
          return null;
        }

        const tableName =
          typeof freshGuest.tableNumber === "number"
            ? `שולחן ${freshGuest.tableNumber}`
            : freshGuest.tableName || "";

        let phone = (freshGuest.phone || "").replace(/\D/g, "");

        if (!phone) return null;

        if (phone.startsWith("0")) {
          phone = "972" + phone.slice(1);
        } else if (!phone.startsWith("972")) {
          phone = "972" + phone;
        }

        const personalRsvpUrl = `https://www.invistimo.com/invite/${invitation.shareId}?token=${freshGuest.token}`;

        const shortRsvpUrl = await shortenUrl(personalRsvpUrl);

        let finalText = baseMessage
          .replace(/{{name}}/g, freshGuest.name || "")
          .replace(/{{rsvpLink}}/g, shortRsvpUrl)
          .replace(/{{tableName}}/g, tableName)
          .replace(/{{navigationLink}}/g, navigationLink);

        if (includeGiftLink && giftLink) {
          finalText += `\n\n🎁 למתנה באשראי:\n${giftLink}`;
        }

        const parts = countBusinessSms(finalText);

        if (parts === -1) return null;

        try {
          const res = await fetch(
            "https://api.sms4free.co.il/ApiSMS/v2/SendSMS",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                key: process.env.SMS4FREE_KEY,
                user: process.env.SMS4FREE_USER,
                pass: process.env.SMS4FREE_PASS,
                sender: process.env.SMS4FREE_SENDER,
                recipient: phone,
                msg: finalText,
              }),
            }
          );

          if (res.ok) {
            return parts;
          }

          return null;
        } catch (err) {
          console.error("❌ SMS SEND ERROR:", err);
          return null;
        }
      });

      const results = await Promise.all(tasks);

      for (const parts of results) {
        if (parts) {
          sent++;
          totalPartsSent += parts;
        }
      }
    }

    if (!usesNewLogic && totalPartsSent > 0) {
      await User.updateOne(
        { _id: user._id },
        { $inc: { smsUsed: totalPartsSent } }
      );
    }

    /* ================= MARK SENT ONLY AFTER ACTUAL SEND ================= */

    if (sent > 0) {
      if (templateKey === "rsvp") {
        const sentField = getRsvpSentField(round);
        const genericSentField = getGenericRsvpSentField(round);
        const scheduledField = getRsvpScheduledField(round);
        const lockField = getRsvpLockField(round);

        const result = await Invitation.updateOne(
          {
            _id: invitationId,
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

        if (result.modifiedCount === 0) {
          throw new Error(`ROUND${round}_ALREADY_SENT_RACE`);
        }
      }

      if (templateKey === "table" || templateKey === "reminder") {
        await Invitation.updateOne(
          { _id: invitationId, reminderSentAt: { $in: [null, undefined] } },
          {
            $set: {
              reminderSentAt: new Date(),
              "messageLocks.reminderSms": true,
            },
          }
        );
      }

      if (templateKey === "custom" || templateKey === "thankyou") {
        await Invitation.updateOne(
          { _id: invitationId, thankYouSentAt: { $in: [null, undefined] } },
          {
            $set: {
              thankYouSentAt: new Date(),
              "messageLocks.thankyouSms": true,
            },
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      charged: totalPartsSent,
    });
  } catch (err: any) {
    console.error("❌ SMS API CRASH:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "SMS_SEND_FAILED",
      },
      { status: 500 }
    );
  }
}