import mongoose, { Schema, models, model } from "mongoose";

const VenueMenuDishSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hallId: {
      type: Schema.Types.ObjectId,
      ref: "VenueHall",
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
    image: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

VenueMenuDishSchema.index({ hallId: 1, name: 1 });

const VenueMenuDish =
  models.VenueMenuDish || model("VenueMenuDish", VenueMenuDishSchema);

export default VenueMenuDish;
