import mongoose, { Schema, Types } from "mongoose";

/* ======================================================
   TYPES
====================================================== */

export type ScheduledMessageStatus =
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

export type ScheduledMessageChannel = "sms" | "whatsapp";

export type ScheduledMessageType =
  | "rsvp"
  | "reminder"
  | "thankyou"
  | "table"
  | "custom";

export type MessageTemplateKey =
  | "rsvp"
  | "table"
  | "custom"
  | "reminder"
  | "thankyou";

export type ScheduledAudienceFilter = "all" | "pending" | "withTable";

export type RsvpRoundNumber = 1 | 2 | 3;

export interface ScheduledMessageDocument {
  _id: Types.ObjectId;

  invitationId: Types.ObjectId;
  userId: Types.ObjectId;

  channel: ScheduledMessageChannel;

  /**
   * סוג הודעה:
   * rsvp / reminder / thankyou / table / custom
   */
  type: ScheduledMessageType;

  /**
   * קהל יעד בזמן השליחה:
   * RSVP round 1 => all
   * RSVP round 2/3 => pending
   */
  filter: ScheduledAudienceFilter;

  /**
   * נשאר לתאימות / custom / הודעות אחרות.
   * לא להשתמש בזה כמקור אמת לסבב 2/3.
   * בסבב 2/3 ה-worker צריך לשלוף pending בזמן השליחה בפועל.
   */
  guestIds?: Types.ObjectId[];

  /**
   * מפתח תבנית כללי.
   */
  templateKey: MessageTemplateKey;

  /**
   * שדה קיים אצלך.
   */
  roundNumber: RsvpRoundNumber;

  /**
   * שדה חדש/נוח יותר.
   * נשמר במקביל ל-roundNumber כדי לא לשבור קוד ישן.
   */
  round: RsvpRoundNumber;

  /**
   * שם תבנית WhatsApp, לדוגמה:
   * rsvp_invitation_media
   * rsvp_reminder_invistimo
   */
  templateName?: string;

  /**
   * נוסח SMS מותאם.
   */
  /**
 * נוסח SMS מותאם.
 */
messageOverride?: string;

/**
 * Payload לתבניות WhatsApp.
 * נשמר עבור worker בזמן שליחה מתוזמנת.
 */
payload?: Record<string, any>;

/**
 * מקור אמת לטקסט שנשמר לתזמון.
 * ב-WhatsApp נשמור ערך טכני כמו whatsapp:templateName
 */
messageContent: string;

  includeGiftLink: boolean;
  giftLink?: string | null;

  /**
   * legacy
   */
  text?: string;

  scheduledAt: Date;

  status: ScheduledMessageStatus;

  guestsCount?: number;
  sentCount?: number;

  sentGuestIds?: Types.ObjectId[];
  completedGuests?: Types.ObjectId[];

  batchSize?: number;

  lastAttemptAt?: Date | null;

  sentAt?: Date | null;
  cancelledAt?: Date | null;

  error?: string;

  lockedAt?: Date | null;
  lockedBy?: string | null;

  priority?: number;

  createdAt: Date;
  updatedAt: Date;
}

/* ======================================================
   HELPERS
====================================================== */

function normalizeRound(value: unknown): RsvpRoundNumber {
  const n = Number(value);

  if (n === 2) return 2;
  if (n === 3) return 3;

  return 1;
}

function getDefaultFilterByTypeAndRound(
  type: ScheduledMessageType,
  round: RsvpRoundNumber
): ScheduledAudienceFilter {
  if (type === "rsvp") {
    return round === 1 ? "all" : "pending";
  }

  return "all";
}

/* ======================================================
   SCHEMA
====================================================== */

const ScheduledMessageSchema = new Schema<ScheduledMessageDocument>(
  {
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    channel: {
      type: String,
      enum: ["sms", "whatsapp"],
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["rsvp", "reminder", "thankyou", "table", "custom"],
      default: "rsvp",
      required: true,
      index: true,
    },

    filter: {
      type: String,
      enum: ["all", "pending", "withTable"],
      default: "all",
      required: true,
      index: true,
    },

    /* ======================
       TARGET AUDIENCE
    ====================== */

    guestIds: {
      type: [Schema.Types.ObjectId],
      ref: "InvitationGuest",
      default: [],
      index: true,
    },

    /* ======================
       TEMPLATE META
    ====================== */

    templateKey: {
      type: String,
      enum: ["rsvp", "table", "custom", "reminder", "thankyou"],
      required: true,
      index: true,
    },

    roundNumber: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
      index: true,
    },

    round: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
      index: true,
    },

    templateName: {
      type: String,
      default: "",
      index: true,
    },

    messageOverride: {
  type: String,
  default: "",
},

/**
 * Payload לתבניות WhatsApp.
 * לדוגמה: languageCode, components, headerImageUrl וכו׳.
 */
payload: {
  type: Schema.Types.Mixed,
  default: {},
},

/* ======================
   MESSAGE CONTENT
====================== */

messageContent: {
  type: String,
  required: true,
  default: "",
},

    /* ======================
       CREDIT GIFT
    ====================== */

    includeGiftLink: {
      type: Boolean,
      default: false,
    },

    giftLink: {
      type: String,
      default: null,
    },

    /* ======================
       LEGACY
    ====================== */

    text: {
      type: String,
      default: "",
    },

    /* ======================
       SCHEDULING
    ====================== */

    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["scheduled", "sending", "sent", "failed", "cancelled"],
      default: "scheduled",
      index: true,
    },

    /* ======================
       QUEUE CONTROL
    ====================== */

    batchSize: {
      type: Number,
      default: 50,
    },

    priority: {
      type: Number,
      default: 1,
      index: true,
    },

    lockedAt: {
      type: Date,
      default: null,
      index: true,
    },

    lockedBy: {
      type: String,
      default: null,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    /* ======================
       TRACKING
    ====================== */

    guestsCount: {
      type: Number,
      default: 0,
    },

    sentCount: {
      type: Number,
      default: 0,
    },

    sentGuestIds: {
      type: [Schema.Types.ObjectId],
      ref: "InvitationGuest",
      default: [],
    },

    completedGuests: {
      type: [Schema.Types.ObjectId],
      ref: "InvitationGuest",
      default: [],
    },

    sentAt: {
      type: Date,
      default: null,
      index: true,
    },

    cancelledAt: {
      type: Date,
      default: null,
      index: true,
    },

    error: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

/* ======================================================
   PRE VALIDATE
====================================================== */

ScheduledMessageSchema.pre("validate", function () {
  const doc = this as ScheduledMessageDocument;

  const normalizedRound = normalizeRound(doc.round ?? doc.roundNumber);

  doc.round = normalizedRound;
  doc.roundNumber = normalizedRound;

  if (!doc.type) {
    doc.type = "rsvp";
  }

  if (!doc.filter) {
    doc.filter = getDefaultFilterByTypeAndRound(doc.type, normalizedRound);
  }

  /**
   * חוק חשוב:
   * באישורי הגעה:
   * סבב 1 = all
   * סבב 2 = pending
   * סבב 3 = pending
   *
   * זה לא אומר שהקהל נקבע עכשיו.
   * זה רק אומר ל-worker מה לשלוף בזמן השליחה בפועל.
   */
  if (doc.type === "rsvp") {
    doc.filter = normalizedRound === 1 ? "all" : "pending";
  }

  const cleanMessageContent = (doc.messageContent || "").trim();
  const cleanMessageOverride = (doc.messageOverride || "").trim();
  const cleanText = (doc.text || "").trim();

  doc.messageContent =
    cleanMessageContent || cleanMessageOverride || cleanText || "";

  doc.messageOverride = cleanMessageOverride;
  doc.text = cleanText;

  if (doc.status !== "cancelled") {
    doc.cancelledAt = null;
  }

  if (doc.status !== "sent") {
    doc.sentAt = doc.sentAt ?? null;
  }

  if (doc.status !== "sending") {
    doc.lockedAt = doc.lockedAt ?? null;
    doc.lockedBy = doc.lockedBy ?? null;
  }
});

/* ======================================================
   INDEXES
====================================================== */

// קרון מחפש הודעות לשליחה
ScheduledMessageSchema.index({
  status: 1,
  scheduledAt: 1,
  lockedAt: 1,
  priority: -1,
});

// רשימת הודעות להזמנה
ScheduledMessageSchema.index({
  invitationId: 1,
  createdAt: -1,
});

// רשימת הודעות למשתמש
ScheduledMessageSchema.index({
  userId: 1,
  createdAt: -1,
});

// שליפה מדויקת לתזמון קיים לפי הפרונט:
// /api/scheduled/by-invitation?invitationId=...&type=rsvp&round=...&channel=...
ScheduledMessageSchema.index({
  invitationId: 1,
  type: 1,
  channel: 1,
  round: 1,
  status: 1,
  scheduledAt: 1,
});

// תאימות לקוד ישן שמשתמש roundNumber/templateKey
ScheduledMessageSchema.index({
  invitationId: 1,
  templateKey: 1,
  channel: 1,
  roundNumber: 1,
  status: 1,
  scheduledAt: 1,
});

// שליחה לפי עדיפות
ScheduledMessageSchema.index({
  priority: -1,
  scheduledAt: 1,
});

/**
 * חשוב:
 * אין כאן unique index.
 *
 * למה?
 * כי את רוצה לאפשר לתזמן מראש כמה דברים במקביל:
 * - RSVP סבב 1
 * - RSVP סבב 2
 * - RSVP סבב 3
 * - תזכורת
 * - הודעת תודה
 *
 * אם יש כבר תזמון פעיל לאותו סבב/ערוץ בדיוק,
 * נטפל בזה ב-API: נעדכן את הקיים במקום ליצור חדש.
 */
ScheduledMessageSchema.index({
  invitationId: 1,
  type: 1,
  channel: 1,
  round: 1,
  status: 1,
});

/* ======================================================
   EXPORT
====================================================== */

const ScheduledMessage =
  mongoose.models.ScheduledMessage ||
  mongoose.model<ScheduledMessageDocument>(
    "ScheduledMessage",
    ScheduledMessageSchema
  );

export default ScheduledMessage;