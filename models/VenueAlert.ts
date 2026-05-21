import mongoose, { Schema, Types } from "mongoose";

export type VenueAlertTone = "amber" | "rose" | "violet" | "emerald";

export type VenueAlertType =
  | "maintenance"
  | "payments"
  | "staff"
  | "menu";

export type VenueAlertDocument = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId | string;

  title: string;
  description: string;

  tone: VenueAlertTone;
  type: VenueAlertType;

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
      enum: ["maintenance", "payments", "staff", "menu"],
      default: "maintenance",
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

export default mongoose.models.VenueAlert ||
  mongoose.model<VenueAlertDocument>("VenueAlert", VenueAlertSchema);