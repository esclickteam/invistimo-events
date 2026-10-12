import mongoose, { Schema, Types } from "mongoose";

const AttemptSchema = new Schema(
  {
    at: { type: Date, required: true },
    kind: { type: String, enum: ["automatic", "manual"], required: true },
    status: { type: String, enum: ["sent", "failed"], required: true },
    error: { type: String, default: "", trim: true },
  },
  { _id: false }
);

export type VenueSeatingBriefingSmsDocument = {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  recipientUserId: Types.ObjectId;
  recipientName: string;
  recipientPhone: string;
  recipientRole: "seating_staff" | "producer" | "both";
  status: "pending" | "sending" | "sent" | "failed";
  kind: "automatic" | "manual" | "";
  sentAt?: Date | null;
  lastAttemptAt?: Date | null;
  error: string;
  history: Array<{
    at: Date;
    kind: "automatic" | "manual";
    status: "sent" | "failed";
    error?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

const VenueSeatingBriefingSmsSchema = new Schema<VenueSeatingBriefingSmsDocument>(
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
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientName: { type: String, default: "", trim: true },
    recipientPhone: { type: String, default: "", trim: true },
    recipientRole: {
      type: String,
      enum: ["seating_staff", "producer", "both"],
      default: "seating_staff",
    },
    status: {
      type: String,
      enum: ["pending", "sending", "sent", "failed"],
      default: "pending",
      index: true,
    },
    kind: {
      type: String,
      enum: ["automatic", "manual", ""],
      default: "",
    },
    sentAt: { type: Date, default: null },
    lastAttemptAt: { type: Date, default: null },
    error: { type: String, default: "", trim: true },
    history: { type: [AttemptSchema], default: [] },
  },
  { timestamps: true }
);

VenueSeatingBriefingSmsSchema.index(
  { eventId: 1, recipientUserId: 1 },
  { unique: true }
);

export default mongoose.models.VenueSeatingBriefingSms ||
  mongoose.model<VenueSeatingBriefingSmsDocument>(
    "VenueSeatingBriefingSms",
    VenueSeatingBriefingSmsSchema
  );
