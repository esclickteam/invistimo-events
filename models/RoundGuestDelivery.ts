import { Schema, models, model } from "mongoose";

/**
 * RoundGuestDelivery
 * רשומה אחת לכל אורח שהיה מיועד לסבב WhatsApp (invitationId + roundKey + guestId).
 *
 * - whatsapp: מה קרה בפועל בערוץ WhatsApp (כולל סיבת אי-שליחה / כשל שנשמרה בזמן האירוע).
 * - sms: SMS fallback של אותו סבב. ערוץ נפרד לחלוטין — לעולם לא משנה את whatsapp.
 * - history: יומן אירועים append-only.
 *
 * WhatsappQueue נשאר תור השליחה בפועל; הרשומה הזו היא שכבת המעקב.
 */

export const WHATSAPP_DELIVERY_STATUSES = [
  "QUEUED",
  "SENDING",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
  "NOT_SENT",
] as const;

export type WhatsappDeliveryStatus = (typeof WHATSAPP_DELIVERY_STATUSES)[number];

export const SMS_FALLBACK_STATUSES = [
  "PENDING",
  "SENT",
  "DELIVERED",
  "FAILED",
  "SKIPPED",
] as const;

export type SmsFallbackStatus = (typeof SMS_FALLBACK_STATUSES)[number];

const HistoryEntrySchema = new Schema(
  {
    at: { type: Date, required: true },
    channel: { type: String, enum: ["whatsapp", "sms"], required: true },
    event: { type: String, required: true },
    status: { type: String, default: null },
    reasonCode: { type: String, default: null },
    message: { type: String, default: null },
    meta: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const RoundGuestDeliverySchema = new Schema(
  {
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
      index: true,
    },
    guestId: {
      type: Schema.Types.ObjectId,
      ref: "InvitationGuest",
      required: true,
      index: true,
    },

    /** `${type}:${round}` — זהה ל-roundKey של דוח הסבבים */
    roundKey: { type: String, required: true },
    type: { type: String, required: true },
    round: { type: Number, required: true },

    source: {
      type: String,
      enum: ["immediate", "scheduled", "pre_rsvp"],
      required: true,
    },
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: "ScheduledMessage",
      default: null,
    },

    /* snapshot בזמן הקביעה שהאורח מיועד לסבב */
    guestName: { type: String, default: "" },
    phone: { type: String, default: "" },
    guestsCount: { type: Number, default: 0 },

    whatsapp: {
      status: {
        type: String,
        enum: WHATSAPP_DELIVERY_STATUSES,
        required: true,
      },
      reasonCode: { type: String, default: null },
      reasonMessage: { type: String, default: null },
      errorCode: { type: String, default: null },
      errorMessage: { type: String, default: null },
      queueId: {
        type: Schema.Types.ObjectId,
        ref: "WhatsappQueue",
        default: null,
      },
      idempotencyKey: { type: String, default: null },
      wamid: { type: String, default: null },
      templateName: { type: String, default: null },
      intendedAt: { type: Date, default: null },
      attemptedAt: { type: Date, default: null },
      sentAt: { type: Date, default: null },
      deliveredAt: { type: Date, default: null },
      readAt: { type: Date, default: null },
      failedAt: { type: Date, default: null },
      notSentAt: { type: Date, default: null },
      updatedAt: { type: Date, default: null },
    },

    sms: {
      status: { type: String, enum: [...SMS_FALLBACK_STATUSES, null], default: null },
      reasonCode: { type: String, default: null },
      reasonMessage: { type: String, default: null },
      /** eventId(invitationId) + roundKey + guestId + "sms" */
      idempotencyKey: { type: String, default: null },
      /** לא לנסות fallback לפני הזמן הזה (grace לווידוא סטטוס WhatsApp סופי / backoff) */
      notBefore: { type: Date, default: null },
      lockId: { type: String, default: null },
      lockedAt: { type: Date, default: null },
      /** נקבע רגע לפני פנייה לספק. אם השרת נופל אחרי זה — לא שולחים שוב. */
      dispatchStartedAt: { type: Date, default: null },
      attempts: { type: Number, default: 0 },
      phone: { type: String, default: null },
      text: { type: String, default: null },
      parts: { type: Number, default: 0 },
      provider: { type: String, default: null },
      providerMessageId: { type: String, default: null },
      providerStatus: { type: String, default: null },
      errorCode: { type: String, default: null },
      errorMessage: { type: String, default: null },
      triggeredAt: { type: Date, default: null },
      sentAt: { type: Date, default: null },
      deliveredAt: { type: Date, default: null },
      failedAt: { type: Date, default: null },
      skippedAt: { type: Date, default: null },
    },

    history: { type: [HistoryEntrySchema], default: [] },
  },
  { timestamps: true }
);

RoundGuestDeliverySchema.index(
  { invitationId: 1, roundKey: 1, guestId: 1 },
  { unique: true, name: "invitation_round_guest_unique" }
);

RoundGuestDeliverySchema.index(
  { "sms.idempotencyKey": 1 },
  {
    unique: true,
    name: "sms_fallback_idempotency_unique",
    partialFilterExpression: { "sms.idempotencyKey": { $type: "string" } },
  }
);

RoundGuestDeliverySchema.index({ "whatsapp.queueId": 1 });
RoundGuestDeliverySchema.index({ "whatsapp.wamid": 1 });
RoundGuestDeliverySchema.index({ "whatsapp.idempotencyKey": 1 });

// Fallback worker polling
RoundGuestDeliverySchema.index({
  "whatsapp.status": 1,
  "sms.status": 1,
  "sms.notBefore": 1,
});

RoundGuestDeliverySchema.index({ "sms.status": 1, "sms.lockedAt": 1 });

export default models.RoundGuestDelivery ||
  model("RoundGuestDelivery", RoundGuestDeliverySchema);
