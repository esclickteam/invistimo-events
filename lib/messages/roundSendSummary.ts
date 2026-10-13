export type RoundDeliverySnapshot = {
  whatsappStatus: string;
  whatsappReasonCode?: string | null;
  smsStatus?: string | null;
};

export type RoundSendSummary = {
  eligible: number;
  whatsappSent: number;
  whatsappDelivered: number;
  whatsappFailed: number;
  smsFallbackAttempted: number;
  smsFallbackSent: number;
  smsFallbackFailed: number;
  leftWithoutSuccess: number;
  pending: number;
};

const EXCLUDED_PHONE_REASONS = new Set(["MISSING_PHONE", "INVALID_PHONE", "NO_PHONE"]);
const WHATSAPP_PENDING = new Set(["QUEUED", "SENDING"]);
const WHATSAPP_SUCCESS = new Set(["SENT", "DELIVERED", "READ"]);
const WHATSAPP_DELIVERED = new Set(["DELIVERED", "READ"]);
const SMS_SUCCESS = new Set(["SENT", "DELIVERED"]);
const SMS_PENDING = new Set(["PENDING"]);

function reason(record: RoundDeliverySnapshot) {
  return String(record.whatsappReasonCode || "").trim();
}

function smsStatus(record: RoundDeliverySnapshot) {
  const status = String(record.smsStatus || "").trim();
  return status || null;
}

export function isExcludedPhoneDelivery(record: RoundDeliverySnapshot) {
  return EXCLUDED_PHONE_REASONS.has(reason(record));
}

/**
 * Final round math from one delivery row per guest.
 * Returns null while WhatsApp or its existing SMS fallback is still open,
 * so an in-progress attempt is never reported as a final failure.
 */
export function summarizeRoundDeliveries(
  records: RoundDeliverySnapshot[],
  options?: { fallbackEnabled?: boolean }
): RoundSendSummary | null {
  const fallbackEnabled = options?.fallbackEnabled !== false;
  const eligibleRecords = records.filter((record) => !isExcludedPhoneDelivery(record));
  let pending = 0;
  for (const record of eligibleRecords) {
    const whatsapp = String(record.whatsappStatus || "").trim();
    const sms = smsStatus(record);
    if (WHATSAPP_PENDING.has(whatsapp)) {
      pending += 1;
      continue;
    }
    if (WHATSAPP_SUCCESS.has(whatsapp)) continue;
    if (fallbackEnabled && (!sms || SMS_PENDING.has(sms))) pending += 1;
  }
  if (pending > 0) return null;

  let whatsappSent = 0;
  let whatsappDelivered = 0;
  let whatsappFailed = 0;
  let smsFallbackAttempted = 0;
  let smsFallbackSent = 0;
  let smsFallbackFailed = 0;
  let successfulGuests = 0;

  for (const record of eligibleRecords) {
    const whatsapp = String(record.whatsappStatus || "").trim();
    const sms = smsStatus(record);
    const whatsappOk = WHATSAPP_SUCCESS.has(whatsapp);
    const smsOk = Boolean(sms && SMS_SUCCESS.has(sms));
    if (whatsappOk) {
      whatsappSent += 1;
      if (WHATSAPP_DELIVERED.has(whatsapp)) whatsappDelivered += 1;
    } else {
      whatsappFailed += 1;
      if (sms && (smsOk || sms === "FAILED")) smsFallbackAttempted += 1;
      if (smsOk) smsFallbackSent += 1;
      if (sms === "FAILED") smsFallbackFailed += 1;
    }
    if (whatsappOk || smsOk) successfulGuests += 1;
  }

  return {
    eligible: eligibleRecords.length,
    whatsappSent,
    whatsappDelivered,
    whatsappFailed,
    smsFallbackAttempted,
    smsFallbackSent,
    smsFallbackFailed,
    leftWithoutSuccess: eligibleRecords.length - successfulGuests,
    pending: 0,
  };
}

export function formatRoundSendSummaryBody(summary: RoundSendSummary) {
  return [
    `רשומות זכאיות לשליחה: ${summary.eligible}`,
    "",
    "WhatsApp:",
    `- נשלחו בהצלחה: ${summary.whatsappSent}`,
    ...(summary.whatsappDelivered > 0
      ? [`- נמסרו: ${summary.whatsappDelivered}`]
      : []),
    `- נכשלו: ${summary.whatsappFailed}`,
    "",
    "SMS גיבוי:",
    `- נשלחו בעקבות כשל WhatsApp: ${summary.smsFallbackAttempted}`,
    `- הצליחו: ${summary.smsFallbackSent}`,
    `- נכשלו: ${summary.smsFallbackFailed}`,
    "",
    `סה"כ רשומות שנותרו ללא שליחה מוצלחת: ${summary.leftWithoutSuccess}`,
  ].join("\n");
}
