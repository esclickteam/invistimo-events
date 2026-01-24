// models/SupplierCategory.js
import mongoose from "mongoose";

const SupplierCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,          // ניקוי רווחים
    },

    subs: {
      type: [String],
      default: [],         // שלא יהיה undefined
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",         // אם בעתיד תרצי populate
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * ⚠️ חובה ב־Next.js (HMR / App Router)
 * מונע MissingSchemaError
 */
export default mongoose.models.SupplierCategory ||
  mongoose.model("SupplierCategory", SupplierCategorySchema);
