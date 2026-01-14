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

  channel: "sms";

  filter: "all" | "pending" | "withTable";

  // 🧠 לוגיקה – מקור אמת
  templateKey: MessageTemplateKey;

  // 🎁 מתנה באשראי
  includeGiftLink: boolean;
  giftLink?: string | null;

  // ⚠️ נשאר לשמירה לאחור / debug בלבד
  // לא חובה, לא מקור אמת
  text?: string;

  scheduledAt: Date;

  status: ScheduledMessageStatus;

  guestsCount?: number;
  sentCount?: number;

  sentAt?: Date;
  error?: string;

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
      enum: ["sms"],
      default: "sms",
      required: true,
    },

    filter: {
      type: String,
      enum: ["all", "pending", "withTable"],
      default: "all",
      required: true,
    },

    /* ======================
       TEMPLATE (SOURCE OF TRUTH)
    ====================== */
    templateKey: {
      type: String,
      enum: ["rsvp", "table", "custom"],
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
       LEGACY / DEBUG TEXT
       (לא חובה, לא בשימוש בלוגיקה)
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

    guestsCount: {
      type: Number,
    },

    sentCount: {
      type: Number,
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
   INDEXES – PERFORMANCE / CRON
====================================================== */

// הודעות מוכנות לשליחה
ScheduledMessageSchema.index({
  status: 1,
  scheduledAt: 1,
});

// היסטוריה לפי הזמנה
ScheduledMessageSchema.index({
  invitationId: 1,
  createdAt: -1,
});

// היסטוריה לפי משתמש
ScheduledMessageSchema.index({
  userId: 1,
  createdAt: -1,
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
