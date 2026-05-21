import mongoose, { Schema, Types } from "mongoose";

export type VenueHallStatus = "active" | "maintenance" | "closed";

export type VenueHallDocument = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId | string;

  id: string;
  name: string;
  subtitle: string;

  capacity: number;
  monthlyEvents: number;
  upcomingEvents: number;
  occupancyRate: number;
  monthlyRevenue: number;

  nextEventAt: string;
  status: VenueHallStatus;
  image: string;

  createdAt: Date;
  updatedAt: Date;
};

const VenueHallSchema = new Schema<VenueHallDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    id: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      default: "אולם חדש",
    },

    subtitle: {
      type: String,
      trim: true,
      default: "",
    },

    capacity: {
      type: Number,
      default: 0,
      min: 0,
    },

    monthlyEvents: {
      type: Number,
      default: 0,
      min: 0,
    },

    upcomingEvents: {
      type: Number,
      default: 0,
      min: 0,
    },

    occupancyRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    monthlyRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },

    nextEventAt: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "maintenance", "closed"],
      default: "active",
      index: true,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

VenueHallSchema.index({ ownerId: 1, id: 1 }, { unique: true });

export default mongoose.models.VenueHall ||
  mongoose.model<VenueHallDocument>("VenueHall", VenueHallSchema);