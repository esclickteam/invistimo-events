import mongoose, { Schema, Types } from "mongoose";

const ContactSchema = new Schema(
  {
    fullName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    phoneNormalized: { type: String, default: "", trim: true },
    relation: { type: String, default: "", trim: true },
    canApproveReserves: { type: Boolean, default: false },
  },
  { _id: false }
);

const ChangeSchema = new Schema(
  {
    at: { type: Date, required: true },
    byUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    byName: { type: String, default: "", trim: true },
    summary: { type: String, default: "", trim: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

export type VenueSeatingContactDocument = {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  primary: {
    fullName: string;
    phone: string;
    phoneNormalized: string;
    relation: string;
    canApproveReserves: boolean;
  };
  secondary: {
    fullName: string;
    phone: string;
    phoneNormalized: string;
    relation: string;
    canApproveReserves: boolean;
  } | null;
  responsibilityAccepted: boolean;
  responsibilityAcceptedAt?: Date | null;
  responsibilityAcceptedByUserId?: Types.ObjectId | null;
  responsibilityAcceptedByName?: string;
  responsibilityVersion: string;
  responsibilityText: string;
  completedAt?: Date | null;
  completedLate: boolean;
  changes: Array<{
    at: Date;
    byUserId?: Types.ObjectId | null;
    byName?: string;
    summary?: string;
    before?: unknown;
    after?: unknown;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

const VenueSeatingContactSchema = new Schema<VenueSeatingContactDocument>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    primary: { type: ContactSchema, required: true },
    secondary: { type: ContactSchema, default: null },
    responsibilityAccepted: { type: Boolean, default: false },
    responsibilityAcceptedAt: { type: Date, default: null },
    responsibilityAcceptedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    responsibilityAcceptedByName: { type: String, default: "", trim: true },
    responsibilityVersion: { type: String, required: true, trim: true },
    responsibilityText: { type: String, required: true },
    completedAt: { type: Date, default: null },
    completedLate: { type: Boolean, default: false },
    changes: { type: [ChangeSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.VenueSeatingContact ||
  mongoose.model<VenueSeatingContactDocument>(
    "VenueSeatingContact",
    VenueSeatingContactSchema
  );
