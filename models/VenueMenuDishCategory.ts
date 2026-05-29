import mongoose, { Schema, models, model } from "mongoose";

const VenueMenuDishCategorySchema = new Schema(
  {
    hallId: {
      type: String,
      required: true,
      index: true,
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
  { hallId: 1, name: 1 },
  { unique: true }
);

export default models.VenueMenuDishCategory ||
  model("VenueMenuDishCategory", VenueMenuDishCategorySchema);