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

export type MessageTemplateKey = "rsvp" | "table" | "custom";

export interface ScheduledMessageDocument {
  _id: Types.ObjectId;

  invitationId: Types.ObjectId;
  userId: Types.ObjectId;

  channel: "sms" | "whatsapp";

  filter: "all" | "pending" | "withTable";

  // ⭐️ מקור אמת לקהל
  guestIds?: Types.ObjectId[];

  // 🧠 לוגיקה / סטטיסטיקה
  templateKey: MessageTemplateKey;

  roundNumber?: number;

  // ✉️ מקור אמת לטקסט
  messageContent: string;

  // 🎁 מתנה באשראי
  includeGiftLink: boolean;
  giftLink?: string | null;

  // ⚠️ legacy
  text?: string;

  scheduledAt: Date;

  status: ScheduledMessageStatus;

  guestsCount?: number;
  sentCount?: number;

  sentGuestIds?: Types.ObjectId[];
  completedGuests?: Types.ObjectId[];

  batchSize?: number;

  lastAttemptAt?: Date;

  sentAt?: Date;

  error?: string;

  lockedAt?: Date;
  lockedBy?: string;

  priority?: number;

  createdAt: Date;
  updatedAt: Date;
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
      default: "sms",
      required: true,
      index: true,
    },

    filter: {
      type: String,
      enum: ["all", "pending", "withTable"],
      default: "all",
      required: true,
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
      enum: ["rsvp", "table", "custom"],
      required: true,
    },

    roundNumber: {
  type: Number,
  default: 1,
},

    /* ======================
       MESSAGE CONTENT
    ====================== */

    messageContent: {
      type: String,
      required: true,
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
    },

    lockedBy: {
      type: String,
    },

    lastAttemptAt: {
      type: Date,
    },

    /* ======================
       TRACKING
    ====================== */

    guestsCount: {
      type: Number,
    },

    sentCount: {
      type: Number,
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
    },

    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

/* ======================================================
   INDEXES
====================================================== */

// קרון מחפש הודעות לשליחה
ScheduledMessageSchema.index({
  status: 1,
  scheduledAt: 1,
  lockedAt: 1,
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

// שליחה לפי עדיפות
ScheduledMessageSchema.index({
  priority: -1,
  scheduledAt: 1,
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