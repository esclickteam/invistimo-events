import { Schema, models, model } from "mongoose";

const VenueHallSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    complexId: {
      type: Schema.Types.ObjectId,
      ref: "VenueComplex",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    minGuests: {
      type: Number,
      default: 0,
    },

    maxGuests: {
      type: Number,
      default: 0,
    },

    basePricePerGuest: {
      type: Number,
      default: 0,
    },

    eventTypes: {
      type: [String],
      default: [],
    },

    features: {
      type: [String],
      default: [],
    },

    floorPlanUrl: {
      type: String,
      default: "",
    },

    gallery: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

VenueHallSchema.index({ ownerId: 1, complexId: 1 });
VenueHallSchema.index({ complexId: 1, name: 1 });

const VenueHall = models.VenueHall || model("VenueHall", VenueHallSchema);

export default VenueHall;