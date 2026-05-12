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
export function isRsvpRoundAlreadySent(invitation: any, round: RsvpRound) {
  const key = getRoundKey(round);

  return Boolean(
    invitation?.rsvpRoundsSent?.[key]?.sentAt ||
      invitation?.[`rsvpRound${round}SentAt`] ||
      invitation?.[`rsvpSmsRound${round}SentAt`] ||
      invitation?.[`rsvpWhatsappRound${round}SentAt`]
  );
}

/**
 * מחזיר מידע מסודר לפרונט / API.
 */
export function getRsvpRoundLockInfo(invitation: any, round: RsvpRound) {
  const key = getRoundKey(round);

  const sourceOfTruthSentAt =
    invitation?.rsvpRoundsSent?.[key]?.sentAt || null;

  const genericSentAt = invitation?.[`rsvpRound${round}SentAt`] || null;
  const smsSentAt = invitation?.[`rsvpSmsRound${round}SentAt`] || null;
  const whatsappSentAt =
    invitation?.[`rsvpWhatsappRound${round}SentAt`] || null;

  const sentAt =
    sourceOfTruthSentAt ||
    genericSentAt ||
    smsSentAt ||
    whatsappSentAt ||
    null;

  const channel =
    invitation?.rsvpRoundsSent?.[key]?.channel ||
    (smsSentAt ? "sms" : null) ||
    (whatsappSentAt ? "whatsapp" : null) ||
    null;

  return {
    round,
    locked: Boolean(sentAt),
    sentAt,
    channel,
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

        // תאימות אחורה:
        // אם כבר היה סימון ישן, לא חייבים לדרוס, אבל כן נרצה שה-update לא ייכשל במקרים ישנים.
        { [`rsvpRound${round}SentAt`]: null },
      ],
    },
    {
      $set: {
        [`rsvpRoundsSent.${key}.sentAt`]: now,
        [`rsvpRoundsSent.${key}.channel`]: channel,

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