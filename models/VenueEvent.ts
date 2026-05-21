import mongoose, { Schema, Types } from "mongoose";

export type VenueEventStatus =
  | "confirmed"
  | "preparing"
  | "live"
  | "done"
  | "cancelled";

export type VenueEventDocument = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId | string;

  hallId: string;
  hallName: string;

  eventName: string;
  date: string;
  time: string;

  status: VenueEventStatus;

  expectedGuests: number;
  revenue: number;

  createdAt: Date;
  updatedAt: Date;
};

const VenueEventSchema = new Schema<VenueEventDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    hallId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    hallName: {
      type: String,
      default: "",
      trim: true,
    },

    eventName: {
      type: String,
      required: true,
      trim: true,
      default: "אירוע",
    },

    date: {
      type: String,
      required: true,
      index: true,
    },

    time: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["confirmed", "preparing", "live", "done", "cancelled"],
      default: "confirmed",
      index: true,
    },

    expectedGuests: {
      type: Number,
      default: 0,
      min: 0,
    },

    revenue: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

VenueEventSchema.index({ ownerId: 1, date: 1 });
VenueEventSchema.index({ ownerId: 1, hallId: 1, date: 1 });

export default mongoose.models.VenueEvent ||
  mongoose.model<VenueEventDocument>("VenueEvent", VenueEventSchema);