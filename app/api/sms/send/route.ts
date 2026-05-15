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
      "תזכורת נוספת לאישור הגעה ל־{{invitationTitle}} 🎉\n\n" +
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
   REMINDER FALLBACK TEMPLATES
   מי שיש לו שולחן יקבל תזכורת עם שולחן.
   מי שאין לו שולחן יקבל תזכורת רגילה בלי שורת שולחן.
====================================================== */

const REMINDER_WITH_TABLE_SERVER_TEMPLATE =
  "היי {{name}} 🌸\n" +
  "תזכורת לקראת {{invitationTitle}} 💛\n\n" +
  "השולחן שלך באירוע:\n" +
  "🪑 {{tableName}}\n\n" +
  "ניווט לאירוע:\n" +
  "{{navigationLink}}\n\n" +
  "מחכים לך!";

const REMINDER_WITHOUT_TABLE_SERVER_TEMPLATE =
  "היי {{name}} 🌸\n" +
  "תזכורת לקראת {{invitationTitle}} 💛\n\n" +
  "ניווט לאירוע:\n" +
  "{{navigationLink}}\n\n" +
  "מחכים לך!";

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
    const isScheduledRequest = Boolean(scheduledAt);

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

    const inv: any = invitation;

    const invitationTitle = inv.title?.trim() || "האירוע שלנו";

    const eventDateText =
      inv.eventDate || inv.date
        ? new Date(inv.eventDate || inv.date).toLocaleDateString("he-IL")
        : "";

    const eventLocationText =
      typeof inv.location === "string"
        ? inv.location
        : inv.location?.address ||
          inv.location?.name ||
          inv.address ||
          inv.eventLocation ||
          "";

    /* ======================================================
       BLOCKS — RSVP לפי סבב כללי בלבד
       תזמון לא נחשב שליחה בפועל.
       מקור אמת חדש:
       rsvpRoundSent.round1 / round2 / round3
    ====================================================== */

    if (templateKey === "rsvp") {
      const roundKey = `round${round}`;
      const alreadySent = Boolean(inv.rsvpRoundSent?.[roundKey]);

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

    if (
      (templateKey === "table" || templateKey === "reminder") &&
      !isScheduledRequest
    ) {
      const reminderAlready =
        inv.reminderSentAt && inv.messageLocks?.reminderSms;

      if (reminderAlready) {
        return NextResponse.json(
          {
            success: false,
            error: "REMINDER_ALREADY_SENT",
          },
          { status: 409 }
        );
      }
    }

    if (
      (templateKey === "custom" || templateKey === "thankyou") &&
      !isScheduledRequest
    ) {
      const thankyouAlready =
        inv.thankYouSentAt && inv.messageLocks?.thankyouSms;

      if (thankyouAlready) {
        return NextResponse.json(
          {
            success: false,
            error: "THANKYOU_ALREADY_SENT",
          },
          { status: 409 }
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

    const location =
      inv.eventLocation && typeof inv.eventLocation === "object"
        ? inv.eventLocation
        : inv.location;

    const navigationAddress =
      typeof inv.location === "string" && inv.location.trim()
        ? inv.location.trim()
        : typeof inv.location?.address === "string" && inv.location.address.trim()
        ? inv.location.address.trim()
        : typeof inv.location?.name === "string" && inv.location.name.trim()
        ? inv.location.name.trim()
        : typeof inv.address === "string" && inv.address.trim()
        ? inv.address.trim()
        : typeof inv.eventLocation?.address === "string" &&
          inv.eventLocation.address.trim()
        ? inv.eventLocation.address.trim()
        : typeof inv.eventLocation?.name === "string" &&
          inv.eventLocation.name.trim()
        ? inv.eventLocation.name.trim()
        : "";

    let navigationLink = "";

    if (
      typeof location?.lat === "number" &&
      typeof location?.lng === "number"
    ) {
      const wazeUrl = `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`;
      navigationLink = await shortenUrl(wazeUrl);
    } else if (navigationAddress) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        navigationAddress
      )}`;

      navigationLink = await shortenUrl(mapsUrl);
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
        .replace(/{{eventDate}}/g, eventDateText)
        .replace(/{{eventLocation}}/g, eventLocationText)
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

      // בתזמון לא חוסמים לפי כמות הקהל הנוכחית.
      // הקהל האמיתי והחיוב בפועל צריכים להיבדק בזמן השליחה המתוזמנת.

      /**
       * שומרים תבנית עם placeholders.
       * בתזכורת/שולחן ה-worker יבנה שוב בזמן השליחה בפועל,
       * כדי שמספר שולחן עדכני ייכנס להודעה.
       */
      let messageContent = baseTemplateText
        .replace(/{{name}}/g, "{{name}}")
        .replace(/{{invitationTitle}}/g, invitationTitle)
        .replace(/{{eventDate}}/g, "{{eventDate}}")
        .replace(/{{eventLocation}}/g, "{{eventLocation}}")
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
      .replace(/{{eventDate}}/g, eventDateText)
      .replace(/{{eventLocation}}/g, eventLocationText)
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

      const tasks = batch.map(async (freshGuest: any) => {
        if (
          template.requiresTable &&
          !freshGuest.tableName &&
          typeof freshGuest.tableNumber !== "number"
        ) {
          return null;
        }

        const tableName =
          freshGuest.tableName ||
          (typeof freshGuest.tableNumber === "number"
            ? `שולחן ${freshGuest.tableNumber}`
            : "");

        const guestHasTable = !!tableName;

        let phone = (freshGuest.phone || "").replace(/\D/g, "");

        if (!phone) return null;

        if (phone.startsWith("0")) {
          phone = "972" + phone.slice(1);
        } else if (!phone.startsWith("972")) {
          phone = "972" + phone;
        }

        const personalRsvpUrl = `https://www.invistimo.com/invite/${inv.shareId}?token=${freshGuest.token}`;
        const shortRsvpUrl = await shortenUrl(personalRsvpUrl);

        /**
         * תיקון חשוב:
         * בתזכורת/שולחן, מי שיש לו שולחן מקבל הודעה עם שולחן.
         * מי שאין לו שולחן מקבל הודעה רגילה בלי המשפט "השולחן שלך באירוע".
         *
         * RSVP / תודה / custom נשארים בדיוק לפי baseMessage.
         */
        let messageForGuest = baseMessage;

        if (templateKey === "table" || templateKey === "reminder") {
          messageForGuest = guestHasTable
            ? baseMessage.includes("{{tableName}}")
              ? baseMessage
              : REMINDER_WITH_TABLE_SERVER_TEMPLATE
            : REMINDER_WITHOUT_TABLE_SERVER_TEMPLATE;
        }

        let finalText = messageForGuest
          .replace(/{{name}}/g, freshGuest.name || "")
          .replace(/{{invitationTitle}}/g, invitationTitle)
          .replace(/{{eventDate}}/g, eventDateText)
          .replace(/{{eventLocation}}/g, eventLocationText)
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
    const scheduledField = getRsvpScheduledField(round);
    const now = new Date();

    const markResult = await Invitation.collection.updateOne(
      { _id: inv._id },
      {
        
        $set: {
          [`rsvpRoundSent.round${round}`]: {
            channel: "sms",
            sentAt: now,
            sentCount: sent,
          },
          updatedAt: now,
        },
        $unset: {
          [scheduledField]: "",
        },
      }
    );

    console.log("✅ RSVP SMS ROUND MARKED SENT:", {
      invitationId: String(inv._id),
      round,
      sent,
      matchedCount: markResult.matchedCount,
      modifiedCount: markResult.modifiedCount,
    });
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