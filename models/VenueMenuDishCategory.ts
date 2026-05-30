import mongoose, { Schema, models, model } from "mongoose";

const VenueMenuDishCategorySchema = new Schema(
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

    name: {
      type: String,
      required: true,
      trim: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

VenueMenuDishCategorySchema.index(
  { ownerId: 1, hallId: 1, name: 1 },
  { unique: true }
);

export default models.VenueMenuDishCategory ||
  model("VenueMenuDishCategory", VenueMenuDishCategorySchema);