// models/Supplier.js
import mongoose from "mongoose";

const SupplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    link: {
      type: String,
      trim: true,
      default: "",
    },

    basePrice: {
      type: Number,
      default: 0,
    },

    advancePrice: {
      type: Number,
      default: 0,
    },

    includes: {
      type: [String],
      default: [],
    },

    notes: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      trim: true,
      default: "",
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupplierCategory",
      required: true,
    },

    sub: {
      type: String,
      required: true,
      trim: true,
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

/**
 * ⚠️ חובה ב־Next.js App Router
 * אחרת תקבלי MissingSchemaError ב־populate
 */
export default mongoose.models.Supplier ||
  mongoose.model("Supplier", SupplierSchema);