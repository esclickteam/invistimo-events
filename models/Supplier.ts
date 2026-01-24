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
    },

    link: {
      type: String,
      trim: true,
    },

    basePrice: {
      type: Number,
      default: 0,
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
