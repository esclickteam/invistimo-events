import dbConnect from "@/lib/db";
import ScheduledMessage from "@/models/ScheduledMessage";
import WhatsappQueue from "@/models/WhatsappQueue";
import InvitationGuest from "@/models/InvitationGuest";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import { shortenUrl } from "@/lib/shortenUrl";

import {
  sendRsvpTemplateMedia,
  type SendRsvpTemplateMediaInput,
} from "@/lib/whatsapp/sendRsvpTemplateMedia";

/* ======================================================
   TYPES
====================================================== */

type Channel = "sms" | "whatsapp";
type RoundNumber = 1 | 2 | 3;
type ScheduleType = "rsvp" | "reminder" | "thankyou" | "table" | "custom";

/* ======================================================
   HELPERS
====================================================== */

function countBusinessSms(text: string) {
  const length = [...text].length;

  if (length <= 200) return 1;
  if (length <= 320) return 2;

  return -1;
}

function normalizeRound(value: any): RoundNumber {
  const n = Number(value);

  if (n === 2) return 2;
  if (n === 3) return 3;

  return 1;
}

function normalizeAllowedMessageRounds(value: any): 2 | 3 {
  return Number(value) === 3 ? 3 : 2;
}

function isRoundAllowedForUser(user: any, round: RoundNumber) {
  if (round !== 3) return true;

  const allowedMessageRounds = normalizeAllowedMessageRounds(
    user?.allowedMessageRounds ||
      user?.planLimits?.allowedMessageRounds ||
      2
  );

  return allowedMessageRounds >= 3;
}

function normalizeType(value: any): ScheduleType {
  if (
    value === "rsvp" ||
    value === "reminder" ||
    value === "thankyou" ||
    value === "table" ||
    value === "custom"
  ) {
    return value;
  }

  return "custom";
}

function getRsvpSmsScheduledField(round: RoundNumber) {
  return `rsvpSmsRound${round}ScheduledAt`;
}

function getRsvpWhatsappScheduledField(round: RoundNumber) {
  return `rsvpWhatsappRound${round}ScheduledAt`;
}

function getReminderScheduledField(channel: Channel) {
  return channel === "sms" ? "reminderSmsScheduledAt" : "reminderScheduledAt";
}

function getThankYouScheduledField(channel: Channel) {
  return channel === "sms" ? "thankYouSmsScheduledAt" : "thankYouScheduledAt";
}

function isRsvpRoundSent(invitation: any, round: RoundNumber) {
  const roundData = invitation?.rsvpRoundSent?.[`round${round}`];

  return Boolean(
    roundData?.sentAt ||
      roundData?.sentAtSms ||
      roundData?.sentAtWhatsapp ||
      roundData?.smsSentAt ||
      roundData?.whatsappSentAt ||
      invitation?.adminMessageRoundLocks?.[`rsvp_${round}`]
  );
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

async function buildNavigationLink(invitation: any) {
  const shareId = String(invitation?.shareId || "").trim();

  if (!shareId) return "";

  return shortenUrl(`https://www.invistimo.com/e/${shareId}`);
}

function buildGuestsQuery({
  schedule,
  invitationId,
}: {
  schedule: any;
  invitationId: any;
}) {
  const type = normalizeType(schedule.type || schedule.templateKey);
  const round = normalizeRound(schedule.round ?? schedule.roundNumber);

  if (type === "rsvp") {
    if (round === 1) {
      return { invitationId };
    }

    return {
      invitationId,
      rsvp: "pending",
    };
  }

  if (type === "reminder" || type === "table") {
    return {
      invitationId,
      rsvp: "yes",
    };
  }

  if (type === "thankyou") {
    return {
      invitationId,
      rsvp: "yes",
    };
  }

  if (Array.isArray(schedule.guestIds) && schedule.guestIds.length > 0) {
    return {
      _id: { $in: schedule.guestIds },
      invitationId,
    };
  }

  const query: any = { invitationId };

  if (schedule.filter === "pending") {
    query.rsvp = "pending";
  }

  if (schedule.filter === "withTable") {
    query.$or = [
      { tableName: { $exists: true, $ne: "" } },
      { tableNumber: { $ne: null } },
    ];
  }

  return query;
}

const AUTO_REMINDER_BY_TABLE = "__AUTO_REMINDER_BY_TABLE__";

const REMINDER_WITH_TABLE_SERVER_TEMPLATE =
  "תזכורת לאירוע {{invitationTitle}}.\n\n" +
  "מספר השולחן שלך:\n" +
  "{{tableName}}\n\n" +
  "לכל פרטי האירוע והניווט:\n" +
  "{{navigationLink}}\n\n" +
  "נשמח לראותכם ❤️";

const REMINDER_WITHOUT_TABLE_SERVER_TEMPLATE =
  "תזכורת לאירוע {{invitationTitle}}.\n\n" +
  "לכל פרטי האירוע והניווט:\n" +
  "{{navigationLink}}\n\n" +
  "נשמח לראותכם ❤️";

function getTableName(guest: any) {
  const tableName = String(guest?.tableName || "").trim();

  if (tableName) {
    return tableName;
  }

  if (typeof guest?.tableNumber === "number") {
    return `שולחן ${guest.tableNumber}`;
  }

  return "";
}

function stripTableBlockForGuestWithoutTable(text: string) {
  return String(text || "")
    .replace(
      /\n*(?:השולחן שלך באירוע|מספר השולחן שלך באירוע|מספר השולחן שלך):\s*\n*(?:🪑\s*)?{{tableName}}\s*\n*/g,
      "\n"
    )
    .replace(
      /\n*(?:השולחן שלך באירוע|מספר השולחן שלך באירוע|מספר השולחן שלך):\s*\n*(?:🪑\s*)?\n*/g,
      "\n"
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function buildSmsText({
  schedule,
  invitation,
  guest,
  navigationLink,
}: {
  schedule: any;
  invitation: any;
  guest: any;
  navigationLink: string;
}) {
  const invitationTitle = invitation?.title?.trim() || "האירוע שלנו";

  const personalUrl = `https://www.invistimo.com/invite/${invitation.shareId}?token=${guest.token}`;
  const shortUrl = await shortenUrl(personalUrl);

  const tableName = getTableName(guest);
  const guestHasTable = !!tableName;

  const type = normalizeType(schedule.type || schedule.templateKey);

  let template = String(
    schedule.messageContent || schedule.messageOverride || ""
  );

  if (type === "reminder" || type === "table") {
    const isAutoReminder =
      template === AUTO_REMINDER_BY_TABLE ||
      schedule.messageOverride === AUTO_REMINDER_BY_TABLE ||
      schedule.text === AUTO_REMINDER_BY_TABLE;

    if (isAutoReminder) {
      template = guestHasTable
        ? REMINDER_WITH_TABLE_SERVER_TEMPLATE
        : REMINDER_WITHOUT_TABLE_SERVER_TEMPLATE;
    } else if (!guestHasTable) {
      template = stripTableBlockForGuestWithoutTable(template);
    }
  }

  return template
    .replace(/{{name}}/g, guest.name || "")
    .replace(/{{invitationTitle}}/g, invitationTitle)
    .replace(/{{rsvpLink}}/g, shortUrl)
    .replace(/{{tableName}}/g, tableName)
    .replace(/{{navigationLink}}/g, navigationLink || "");
}

function deepReplacePlaceholders(
  value: any,
  replacements: Record<string, string>
): any {
  if (typeof value === "string") {
    let next = value;

    for (const [key, replacement] of Object.entries(replacements)) {
      next = next.replace(new RegExp(`{{${key}}}`, "g"), replacement);
    }

    return next;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepReplacePlaceholders(item, replacements));
  }

  if (value && typeof value === "object") {
    const out: any = {};

    for (const [key, item] of Object.entries(value)) {
      out[key] = deepReplacePlaceholders(item, replacements);
    }

    return out;
  }

  return value;
}

/* ======================================================
   SMS SEND
====================================================== */

async function sendSms({ phone, text }: { phone: string; text: string }) {
  try {
    const res = await fetch("https://api.sms4free.co.il/ApiSMS/v2/SendSMS", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: process.env.SMS4FREE_KEY,
        user: process.env.SMS4FREE_USER,
        pass: process.env.SMS4FREE_PASS,
        sender: process.env.SMS4FREE_SENDER,
        recipient: phone,
        msg: text,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error("❌ SMS send error:", err);
    return false;
  }
}

/* ======================================================
   WHATSAPP SEND
====================================================== */

async function sendWhatsappTemplate({
  phone,
  templateName,
  payload,
}: {
  phone: string;
  templateName: string;
  payload: any;
}) {
  try {
    const result = await sendRsvpTemplateMedia({
      to: phone,
      ...(payload as Omit<SendRsvpTemplateMediaInput, "to" | "templateName">),
      templateName,
    });

    return {
      success: true,
      wamid: result?.providerResponse?.messages?.[0]?.id || null,
      error: null,
      providerResponse: result?.providerResponse || null,
    };
  } catch (err: any) {
    console.error("❌ WhatsApp provider error:", err?.message || err);

    return {
      success: false,
      wamid: null,
      error: err,
      providerResponse: err?.providerResponse || null,
    };
  }
}

/* ======================================================
   SCHEDULE HELPERS
====================================================== */

async function cancelScheduledBecauseRoundAlreadySent({
  scheduleId,
  round,
  channel,
}: {
  scheduleId: any;
  round: RoundNumber;
  channel: Channel;
}) {
  await ScheduledMessage.updateOne(
    { _id: scheduleId },
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        error: `RSVP_ROUND_${round}_ALREADY_SENT_BEFORE_${channel.toUpperCase()}_SCHEDULED_SEND`,
      },
    }
  );
}

async function cancelScheduledBecauseRoundNotAllowed({
  scheduleId,
}: {
  scheduleId: any;
}) {
  await ScheduledMessage.updateOne(
    { _id: scheduleId },
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        error: "סבב 3 לא פתוח בחבילה של הלקוח",
      },
    }
  );
}

async function markInvitationAfterSend({
  schedule,
  channel,
  sent,
}: {
  schedule: any;
  channel: Channel;
  sent: number;
}) {
  if (sent <= 0) return;

  const type = normalizeType(schedule.type || schedule.templateKey);
  const round = normalizeRound(schedule.round ?? schedule.roundNumber);
  const now = new Date();

  if (type === "rsvp") {
    const scheduledField =
      channel === "sms"
        ? getRsvpSmsScheduledField(round)
        : getRsvpWhatsappScheduledField(round);

    const result = await Invitation.collection.updateOne(
      { _id: schedule.invitationId },
      {
        $set: {
          [`rsvpRoundSent.round${round}`]: {
            channel,
            sentAt: now,
            sentCount: sent,
            source: "scheduled",
          },
          updatedAt: now,
        },
        $unset: {
          [scheduledField]: "",
        },
      }
    );

    console.log("✅ SCHEDULED RSVP ROUND MARKED SENT:", {
      invitationId: String(schedule.invitationId),
      channel,
      round,
      sent,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });

    return;
  }

  if (type === "reminder" || type === "table") {
    const scheduledField = getReminderScheduledField(channel);

    const result = await Invitation.collection.updateOne(
      { _id: schedule.invitationId },
      {
        $set: {
          reminderSentAt: now,
          updatedAt: now,
        },
        $unset: {
          [scheduledField]: "",
        },
      }
    );

    console.log("✅ SCHEDULED REMINDER MARKED SENT:", {
      invitationId: String(schedule.invitationId),
      channel,
      sent,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });

    return;
  }

  if (type === "thankyou" || type === "custom") {
    const scheduledField = getThankYouScheduledField(channel);

    const result = await Invitation.collection.updateOne(
      { _id: schedule.invitationId },
      {
        $set: {
          thankYouSentAt: now,
          updatedAt: now,
        },
        $unset: {
          [scheduledField]: "",
        },
      }
    );

    console.log("✅ SCHEDULED THANKYOU MARKED SENT:", {
      invitationId: String(schedule.invitationId),
      channel,
      sent,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  }
}

/* ======================================================
   SMS WORKER
====================================================== */

export async function sendScheduledSms() {
  await dbConnect();

  const now = new Date();

  let processed = 0;
  let sentTotal = 0;
  let failed = 0;

  const MAX_PER_RUN = 50;
  const STUCK_AFTER_MS = 10 * 60 * 1000;

  await ScheduledMessage.updateMany(
    {
      channel: "sms",
      status: "sending",
      $or: [
        { lockedAt: { $lt: new Date(Date.now() - STUCK_AFTER_MS) } },
        { lockedAt: null },
        { lockedAt: { $exists: false } },
      ],
    },
    {
      $set: {
        status: "scheduled",
        lockedAt: null,
        lockedBy: null,
      },
    }
  );

  const messages: any[] = [];

  for (let i = 0; i < MAX_PER_RUN; i++) {
    const msg = await ScheduledMessage.findOneAndUpdate(
      {
        channel: "sms",
        status: "scheduled",
        scheduledAt: { $lte: now },
      },
      {
        $set: {
          status: "sending",
          lockedAt: new Date(),
          lockedBy: "sms-worker",
          lastAttemptAt: new Date(),
        },
      },
      {
        sort: { scheduledAt: 1, priority: -1 },
        new: true,
      }
    );

    if (!msg) break;
    messages.push(msg);
  }

  for (const msg of messages) {
    processed++;

    try {
      const freshBefore = await ScheduledMessage.findById(msg._id).lean();

      if (!freshBefore || freshBefore.status === "cancelled") {
        continue;
      }

      const type = normalizeType(msg.type || msg.templateKey);
      const round = normalizeRound(msg.round ?? msg.roundNumber);

      const invitation: any = await Invitation.findById(msg.invitationId).lean();
      const user: any = await User.findById(msg.userId).lean();

      if (!invitation || !user) {
        throw new Error("INVITATION_OR_USER_NOT_FOUND");
      }

      if (type === "rsvp" && round === 3 && !isRoundAllowedForUser(user, round)) {
        await cancelScheduledBecauseRoundNotAllowed({
          scheduleId: msg._id,
        });

        continue;
      }

      if (type === "rsvp" && isRsvpRoundSent(invitation, round)) {
        await cancelScheduledBecauseRoundAlreadySent({
          scheduleId: msg._id,
          round,
          channel: "sms",
        });

        continue;
      }

      if ((type === "reminder" || type === "table") && invitation.reminderSentAt) {
        await ScheduledMessage.updateOne(
          { _id: msg._id },
          {
            $set: {
              status: "cancelled",
              cancelledAt: new Date(),
              lockedAt: null,
              lockedBy: null,
              error: "REMINDER_ALREADY_SENT_BEFORE_SMS_SCHEDULED_SEND",
            },
          }
        );

        continue;
      }

      if ((type === "thankyou" || type === "custom") && invitation.thankYouSentAt) {
        await ScheduledMessage.updateOne(
          { _id: msg._id },
          {
            $set: {
              status: "cancelled",
              cancelledAt: new Date(),
              lockedAt: null,
              lockedBy: null,
              error: "THANKYOU_ALREADY_SENT_BEFORE_SMS_SCHEDULED_SEND",
            },
          }
        );

        continue;
      }

      const navigationLink = await buildNavigationLink(invitation);

      const guestsQuery = buildGuestsQuery({
        schedule: msg,
        invitationId: msg.invitationId,
      });

      const guests = await InvitationGuest.find(guestsQuery).lean();

      let sent = 0;
      let charged = 0;
      const sentGuestIds: any[] = [];

      for (const guest of guests) {
        const freshMid = await ScheduledMessage.findById(msg._id).lean();

        if (!freshMid || freshMid.status === "cancelled") {
          break;
        }

        const phone = normalizePhone(guest.phone);
        if (!phone) continue;

        const text = await buildSmsText({
          schedule: msg,
          invitation,
          guest,
          navigationLink,
        });

        const parts = countBusinessSms(text);
        if (parts === -1) continue;

        const ok = await sendSms({
          phone,
          text,
        });

        if (ok) {
          sent++;
          charged += parts;
          sentGuestIds.push(guest._id);
        }
      }

      if (sent > 0 && user.isActive !== false && charged > 0) {
        await User.updateOne(
          { _id: user._id },
          { $inc: { smsUsed: charged } }
        );
      }

      await ScheduledMessage.updateOne(
        {
          _id: msg._id,
          status: { $ne: "cancelled" },
        },
        {
          $set: {
            status: "sent",
            sentAt: new Date(),
            lockedAt: null,
            lockedBy: null,
            error: "",
          },
          $inc: {
            sentCount: sent,
          },
          $push: {
            sentGuestIds: { $each: sentGuestIds },
          },
        }
      );

      await markInvitationAfterSend({
        schedule: msg,
        channel: "sms",
        sent,
      });

      sentTotal += sent;
    } catch (err: any) {
      console.error("💥 SMS worker error:", err);

      await ScheduledMessage.updateOne(
        {
          _id: msg._id,
          status: { $ne: "cancelled" },
        },
        {
          $set: {
            status: "failed",
            error: err?.message || "UNKNOWN_ERROR",
            lockedAt: null,
            lockedBy: null,
          },
        }
      );

      failed++;
    }
  }

  return {
    processed,
    sent: sentTotal,
    failed,
  };
}

/* ======================================================
   WHATSAPP WORKER
====================================================== */

export async function sendScheduledWhatsapp() {
  await dbConnect();

  const now = new Date();

  let processed = 0;
  let sentTotal = 0;
  let failed = 0;

  const MAX_PER_RUN = 50;
  const STUCK_AFTER_MS = 10 * 60 * 1000;

  await ScheduledMessage.updateMany(
    {
      channel: "whatsapp",
      status: "sending",
      $or: [
        { lockedAt: { $lt: new Date(Date.now() - STUCK_AFTER_MS) } },
        { lockedAt: null },
        { lockedAt: { $exists: false } },
      ],
    },
    {
      $set: {
        status: "scheduled",
        lockedAt: null,
        lockedBy: null,
      },
    }
  );

  const messages: any[] = [];

  for (let i = 0; i < MAX_PER_RUN; i++) {
    const msg = await ScheduledMessage.findOneAndUpdate(
      {
        channel: "whatsapp",
        status: "scheduled",
        scheduledAt: { $lte: now },
      },
      {
        $set: {
          status: "sending",
          lockedAt: new Date(),
          lockedBy: "whatsapp-worker",
          lastAttemptAt: new Date(),
        },
      },
      {
        sort: { scheduledAt: 1, priority: -1 },
        new: true,
      }
    );

    if (!msg) break;
    messages.push(msg);
  }

  for (const msg of messages) {
    processed++;

    try {
      const freshBefore = await ScheduledMessage.findById(msg._id).lean();

      if (!freshBefore || freshBefore.status === "cancelled") {
        continue;
      }

      const type = normalizeType(msg.type || msg.templateKey);
      const round = normalizeRound(msg.round ?? msg.roundNumber);

      const invitation: any = await Invitation.findById(msg.invitationId).lean();
      const user: any = await User.findById(msg.userId).lean();

      if (!invitation || !user) {
        throw new Error("INVITATION_OR_USER_NOT_FOUND");
      }

      if (type === "rsvp" && round === 3 && !isRoundAllowedForUser(user, round)) {
        await cancelScheduledBecauseRoundNotAllowed({
          scheduleId: msg._id,
        });

        continue;
      }

      if (type === "rsvp" && isRsvpRoundSent(invitation, round)) {
        await cancelScheduledBecauseRoundAlreadySent({
          scheduleId: msg._id,
          round,
          channel: "whatsapp",
        });

        continue;
      }

      if ((type === "reminder" || type === "table") && invitation.reminderSentAt) {
        await ScheduledMessage.updateOne(
          { _id: msg._id },
          {
            $set: {
              status: "cancelled",
              cancelledAt: new Date(),
              lockedAt: null,
              lockedBy: null,
              error: "REMINDER_ALREADY_SENT_BEFORE_WHATSAPP_SCHEDULED_SEND",
            },
          }
        );

        continue;
      }

      if ((type === "thankyou" || type === "custom") && invitation.thankYouSentAt) {
        await ScheduledMessage.updateOne(
          { _id: msg._id },
          {
            $set: {
              status: "cancelled",
              cancelledAt: new Date(),
              lockedAt: null,
              lockedBy: null,
              error: "THANKYOU_ALREADY_SENT_BEFORE_WHATSAPP_SCHEDULED_SEND",
            },
          }
        );

        continue;
      }

      const navigationLink = await buildNavigationLink(invitation);

      const guestsQuery = buildGuestsQuery({
        schedule: msg,
        invitationId: msg.invitationId,
      });

      const guests = await InvitationGuest.find(guestsQuery).lean();

      let sent = 0;
      const sentGuestIds: any[] = [];

      for (const guest of guests) {
        const freshMid = await ScheduledMessage.findById(msg._id).lean();

        if (!freshMid || freshMid.status === "cancelled") {
          break;
        }

        const phone = normalizePhone(guest.phone);
        if (!phone) continue;

        const tableName = getTableName(guest);

        const urlSuffix = `invite/${invitation.shareId}?token=${guest.token}`;
        const personalUrl = `https://www.invistimo.com/${urlSuffix}`;

        const replacements = {
          name: guest.name || "",
          invitationTitle: invitation.title || "האירוע שלנו",
          rsvpLink: personalUrl,
          urlSuffix,
          tableName,
          navigationLink: navigationLink || "",
        };

        const payload = deepReplacePlaceholders(msg.payload || {}, replacements);

        const templateName = String(msg.templateName || "").trim();

        if (!templateName) {
          throw new Error("MISSING_WHATSAPP_TEMPLATE_NAME");
        }

        const idempotencyKey = [
          "whatsapp",
          type,
          String(msg.invitationId),
          String(round),
          String(guest._id),
          String(msg._id),
          templateName,
        ].join(":");

        const existingQueue = await WhatsappQueue.findOne({ idempotencyKey }).lean();

if (existingQueue) {
  console.log("⛔ Skipping duplicate scheduled WhatsApp send", {
    idempotencyKey,
    queueId: String(existingQueue._id),
    status: existingQueue.status,
    attempts: existingQueue.attempts,
    wamid: existingQueue.wamid,
  });

  continue;
}

await WhatsappQueue.create({
  invitationId: msg.invitationId,
  guestId: guest._id,
  scheduleId: msg._id,

  channel: "whatsapp",
  type,
  round,
  roundNumber: round,

  phone,
  templateName,
  idempotencyKey,
  payload,

  scheduledAt: msg.scheduledAt,
  status: "pending",

  attempts: 0,
  maxAttempts: 1,
});

        const freshRightBeforeSend = await ScheduledMessage.findById(
          msg._id
        ).lean();

        if (
          !freshRightBeforeSend ||
          freshRightBeforeSend.status === "cancelled"
        ) {
          await WhatsappQueue.updateOne(
            { idempotencyKey },
            {
              $set: {
                status: "cancelled",
                cancelledAt: new Date(),
                lockedAt: null,
                lockedBy: null,
              },
            }
          );

          break;
        }

        const result = await sendWhatsappTemplate({
          phone,
          templateName,
          payload,
        });

        await WhatsappQueue.updateOne(
          { idempotencyKey },
          {
            $set: {
              status: result.success ? "sent" : "failed",
              wamid: result.wamid || null,
              sentAt: result.success ? new Date() : null,
              failedAt: result.success ? null : new Date(),
              providerStatus: result.success ? "sent" : "failed",
              lastError: result.success
                ? null
                : String(result.error?.message || result.error || ""),
              failReason: {
                code: result.success
                  ? null
                  : result.error?.providerResponse?.error?.code
                  ? String(result.error.providerResponse.error.code)
                  : null,
                message: result.success
                  ? null
                  : String(result.error?.message || result.error || ""),
                raw: result.success
                  ? null
                  : result.error?.providerResponse || result.error || null,
              },
            },
            $inc: {
              attempts: 1,
            },
          }
        );

        if (result.success) {
          sent++;
          sentGuestIds.push(guest._id);
        }
      }

      await ScheduledMessage.updateOne(
        {
          _id: msg._id,
          status: { $ne: "cancelled" },
        },
        {
          $set: {
            status: "sent",
            sentAt: new Date(),
            lockedAt: null,
            lockedBy: null,
            error: "",
          },
          $inc: {
            sentCount: sent,
          },
          $push: {
            sentGuestIds: { $each: sentGuestIds },
          },
        }
      );

      await markInvitationAfterSend({
        schedule: msg,
        channel: "whatsapp",
        sent,
      });

      sentTotal += sent;
    } catch (err: any) {
      console.error("💥 WhatsApp worker error:", err);

      await ScheduledMessage.updateOne(
        {
          _id: msg._id,
          status: { $ne: "cancelled" },
        },
        {
          $set: {
            status: "failed",
            error: err?.message || "UNKNOWN_ERROR",
            lockedAt: null,
            lockedBy: null,
          },
        }
      );

      failed++;
    }
  }

  return {
    processed,
    sent: sentTotal,
    failed,
  };
}