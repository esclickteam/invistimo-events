import mongoose, { Schema, Types } from "mongoose";

export type VenueAlertTone = "amber" | "rose" | "violet" | "emerald";

export type VenueAlertType =
  | "maintenance"
  | "payments"
  | "staff"
  | "menu"
  | "leads"
  | "tasks"
  | "events"
  | "clients"
  | "files"
  | "day_of";

export type VenueAlertDocument = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId | string;
  hallId?: string;

  title: string;
  description: string;

  tone: VenueAlertTone;
  type: VenueAlertType;
  linkHref?: string;
  dedupeKey?: string;
  meta?: Record<string, unknown>;

  read: boolean;

  createdAt: Date;
  updatedAt: Date;
};

const VenueAlertSchema = new Schema<VenueAlertDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    hallId: {
      type: String,
      trim: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    tone: {
      type: String,
      enum: ["amber", "rose", "violet", "emerald"],
      default: "amber",
    },

    type: {
      type: String,
      enum: [
        "maintenance",
        "payments",
        "staff",
        "menu",
        "leads",
        "tasks",
        "events",
        "clients",
        "files",
        "day_of",
      ],
      default: "maintenance",
    },

    linkHref: {
      type: String,
      default: "",
      trim: true,
    },

    dedupeKey: {
      type: String,
      trim: true,
      index: true,
    },

    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

VenueAlertSchema.index({ ownerId: 1, read: 1, createdAt: -1 });
VenueAlertSchema.index({ ownerId: 1, hallId: 1, read: 1, createdAt: -1 });
VenueAlertSchema.index(
  { ownerId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } }
);

export default mongoose.models.VenueAlert ||
  mongoose.model<VenueAlertDocument>("VenueAlert", VenueAlertSchema);
