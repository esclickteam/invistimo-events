import mongoose, { Schema, Types } from "mongoose";

/* ======================================================
   ScheduledMessage Schema
====================================================== */

export type ScheduledMessageStatus =
  | "scheduled"
  | "sending"
  | "sent"
  | "failed";

export interface ScheduledMessageDocument {
  _id: Types.ObjectId;

  invitationId: Types.ObjectId;
  userId: Types.ObjectId;

  channel: "sms";

  filter?: "all" | "pending" | "withTable";
  text: string;

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
   Schema
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
    },

    text: {
      type: String,
      required: true,
    },

    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["scheduled", "sending", "sent", "failed"],
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
   Indexes (ביצועים)
====================================================== */

// לשליפה מהירה של הודעות שמוכנות לשליחה
ScheduledMessageSchema.index({
  status: 1,
  scheduledAt: 1,
});

// היסטוריה לפי הזמנה
ScheduledMessageSchema.index({
  invitationId: 1,
  createdAt: -1,
});

/* ======================================================
   Export
====================================================== */

const ScheduledMessage =
  mongoose.models.ScheduledMessage ||
  mongoose.model<ScheduledMessageDocument>(
    "ScheduledMessage",
    ScheduledMessageSchema
  );

export default ScheduledMessage;
