import mongoose, { Schema, model, models } from "mongoose";

const VenueMenuDishSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // חשוב:
    // אצלך hallId הוא string, לא ObjectId
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

    description: {
      type: String,
      default: "",
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },

    // חדש:
    // קטגוריית המנה בספריית המנות הקבועה
    categoryId: {
      type: String,
      default: "",
      index: true,
    },

    categoryName: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

VenueMenuDishSchema.index({
  ownerId: 1,
  hallId: 1,
  createdAt: -1,
});

VenueMenuDishSchema.index({
  ownerId: 1,
  hallId: 1,
  categoryId: 1,
  createdAt: -1,
});

const VenueMenuDish =
  models.VenueMenuDish || model("VenueMenuDish", VenueMenuDishSchema);

export default VenueMenuDish;