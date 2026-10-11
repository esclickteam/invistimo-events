import mongoose, { Schema, Types } from "mongoose";

export type VenueSeatingReminderLogDocument = {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  stage: "initial" | "h72" | "h24";
  channel: "in_app" | "sms";
  startKey: string;
  status: "sending" | "sent" | "failed" | "skipped";
  attempts: number;
  retryable: boolean;
  detail?: string;
  smsTo?: string;
  sentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const VenueSeatingReminderLogSchema = new Schema<VenueSeatingReminderLogDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    stage: {
      type: String,
      enum: ["initial", "h72", "h24"],
      required: true,
    },
    channel: {
      type: String,
      enum: ["in_app", "sms"],
      required: true,
    },
    startKey: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["sending", "sent", "failed", "skipped"],
      default: "sending",
    },
    attempts: { type: Number, default: 0 },
    retryable: { type: Boolean, default: false },
    detail: { type: String, default: "", trim: true },
    smsTo: { type: String, default: "", trim: true },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

VenueSeatingReminderLogSchema.index(
  { eventId: 1, stage: 1, channel: 1, startKey: 1 },
  { unique: true }
);

export default mongoose.models.VenueSeatingReminderLog ||
  mongoose.model<VenueSeatingReminderLogDocument>(
    "VenueSeatingReminderLog",
    VenueSeatingReminderLogSchema
  );
