import Invitation from "@/models/Invitation";

export type RsvpRound = 1 | 2 | 3;
export type MessageChannel = "sms" | "whatsapp";

export function normalizeRsvpRound(round: unknown): RsvpRound | null {
  const value = Number(round);

  if (value === 1 || value === 2 || value === 3) {
    return value;
  }

  return null;
}

export function getRoundKey(round: RsvpRound) {
  return `round${round}` as "round1" | "round2" | "round3";
}

/**
 * בודק אם הסבב כבר נשלח בפועל.
 * חשוב:
 * - לא בודק תזמון.
 * - לא בודק רק ערוץ ספציפי.
 * - אם SMS נשלח, WhatsApp נחסם.
 * - אם WhatsApp נשלח, SMS נחסם.
 */
function getRoundSentObject(invitation: any, round: RsvpRound) {
  const key = getRoundKey(round);
  return (
    invitation?.rsvpRoundSent?.[key] ||
    invitation?.rsvpRoundsSent?.[key] ||
    null
  );
}

function asDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * מקור אמת משולב:
 * השליחה נכתבת לפעמים ל-rsvpRoundSent ולפעמים ל-rsvpRoundsSent.
 * אובייקט סבב בלי sentAt עדיין נחשב "נשלח" אם יש ערוץ/ספירה.
 */
export function getRsvpRoundSentSnapshot(
  invitation: any,
  round: RsvpRound | number
) {
  const normalized = normalizeRsvpRound(round);

  if (!normalized) {
    return {
      done: false,
      sentAt: null,
      channel: null,
    };
  }

  const roundData = getRoundSentObject(invitation, normalized);

  const sentAt =
    asDate(roundData?.sentAt) ||
    asDate(roundData instanceof Date ? roundData : null) ||
    asDate(roundData?.sentAtSms) ||
    asDate(roundData?.sentAtWhatsapp) ||
    asDate(roundData?.smsSentAt) ||
    asDate(roundData?.whatsappSentAt) ||
    asDate(invitation?.[`rsvpRound${normalized}SentAt`]) ||
    asDate(invitation?.[`rsvpRound${normalized}sentAt`]) ||
    asDate(invitation?.[`rsvpSmsRound${normalized}SentAt`]) ||
    asDate(invitation?.[`rsvpSmsRound${normalized}sentAt`]) ||
    asDate(invitation?.[`rsvpWhatsappRound${normalized}SentAt`]) ||
    asDate(invitation?.[`rsvpWhatsappRound${normalized}sentAt`]) ||
    null;

  const channel =
    roundData?.channel ||
    (invitation?.[`rsvpWhatsappRound${normalized}SentAt`] ||
    invitation?.[`rsvpWhatsappRound${normalized}sentAt`]
      ? "whatsapp"
      : null) ||
    (invitation?.[`rsvpSmsRound${normalized}SentAt`] ||
    invitation?.[`rsvpSmsRound${normalized}sentAt`]
      ? "sms"
      : null) ||
    null;

  const done = Boolean(
    sentAt ||
      channel ||
      Number(roundData?.sentCount || 0) > 0 ||
      roundData === true
  );

  return {
    done,
    sentAt: sentAt ? sentAt.toISOString() : null,
    channel,
  };
}

export function isRsvpRoundAlreadySent(invitation: any, round: RsvpRound) {
  return getRsvpRoundSentSnapshot(invitation, round).done;
}

/**
 * מחזיר מידע מסודר לפרונט / API.
 */
export function getRsvpRoundLockInfo(invitation: any, round: RsvpRound) {
  const snapshot = getRsvpRoundSentSnapshot(invitation, round);

  return {
    round,
    locked: snapshot.done,
    sentAt: snapshot.sentAt,
    channel: snapshot.channel,
  };
}

/**
 * מסמן סבב כנשלח בפועל.
 *
 * לקרוא לפונקציה הזאת רק אחרי שהייתה שליחה אמיתית:
 * - שליחה מיידית שבאמת שלחה הודעות
 * - worker/cron שבאמת שלח הודעות מתוזמנות
 *
 * לא לקרוא בזמן יצירת תזמון.
 */
export async function markRsvpRoundAsActuallySent(params: {
  invitationId: string;
  round: RsvpRound;
  channel: MessageChannel;
}) {
  const { invitationId, round, channel } = params;

  const key = getRoundKey(round);
  const now = new Date();

  const channelSentField =
    channel === "sms"
      ? `rsvpSmsRound${round}SentAt`
      : `rsvpWhatsappRound${round}SentAt`;

  const lockField =
    channel === "sms"
      ? `messageLocks.rsvpSmsRound${round}`
      : `messageLocks.rsvpWhatsappRound${round}`;

  const oppositeLockField =
    channel === "sms"
      ? `messageLocks.rsvpWhatsappRound${round}`
      : `messageLocks.rsvpSmsRound${round}`;

  await Invitation.updateOne(
    {
      _id: invitationId,
      $or: [
        { [`rsvpRoundsSent.${key}.sentAt`]: { $exists: false } },
        { [`rsvpRoundsSent.${key}.sentAt`]: null },
        { [`rsvpRoundSent.${key}.sentAt`]: { $exists: false } },
        { [`rsvpRoundSent.${key}.sentAt`]: null },

        // תאימות אחורה:
        // אם כבר היה סימון ישן, לא חייבים לדרוס, אבל כן נרצה שה-update לא ייכשל במקרים ישנים.
        { [`rsvpRound${round}SentAt`]: null },
      ],
    },
    {
      $set: {
        [`rsvpRoundsSent.${key}.sentAt`]: now,
        [`rsvpRoundsSent.${key}.channel`]: channel,
        [`rsvpRoundSent.${key}.sentAt`]: now,
        [`rsvpRoundSent.${key}.channel`]: channel,

        // שדה כללי ישן לפי סבב
        [`rsvpRound${round}SentAt`]: now,

        // שדה ישן לפי הערוץ ששלח בפועל
        [channelSentField]: now,

        // נועלים את שני הערוצים של אותו סבב
        [lockField]: true,
        [oppositeLockField]: true,
      },
    }
  );
}