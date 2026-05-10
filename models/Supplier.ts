// models/Supplier.js

import mongoose from "mongoose";

const SupplierSchema = new mongoose.Schema(
  {
    /* ======================
       BASIC
    ====================== */

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

    instagram: {
      type: String,
      trim: true,
    },

    image: {
      type: String,
      trim: true,
    },

    /* ======================
       FINANCIAL
    ====================== */

    basePrice: {
      type: Number,
      default: 0,
    },

    /* ======================
       CATEGORY
    ====================== */

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

    /* ======================
       DETAILS
    ====================== */

    includes: {
      type: [String],
      default: [],
    },

    notes: {
      type: String,
      trim: true,
    },

    rating: {
      type: Number,
      default: 5,
    },

    /* ======================
       OWNER
    ====================== */

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
  mongoose.model(
    "Supplier",
    SupplierSchema
  );