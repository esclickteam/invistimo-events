// models/EventSupplier.js
import mongoose from "mongoose";

const EventSupplierSchema = new mongoose.Schema(
  {
    /* =========================
       🔗 אירוע
    ========================= */
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "Event",
    },

    /* =========================
       🗂 קטגוריה (CRITICAL)
    ========================= */
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupplierCategory",
      required: true,
      index: true,
    },

    // שם לתצוגה (נשאר – טוב ל־UI ול־historical data)
    category: {
      type: String,
      required: true,
      trim: true,
    },

    sub: {
      type: String,
      required: true,
      trim: true,
    },

    /* =========================
       🧑 ספק נבחר
    ========================= */
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
      index: true,
    },

    /* =========================
       💰 תמחור
    ========================= */
    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    advance: {
      type: Number,
      default: 0,
      min: 0,
    },

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* =========================
       📎 קבצים (Cloudinary)
    ========================= */
    files: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
        type: {
          type: String, // pdf / image / docx וכו'
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

/**
 * ⚠️ חובה ב־Next.js App Router (HMR-safe)
 */
export default mongoose.models.EventSupplier ||
  mongoose.model("EventSupplier", EventSupplierSchema);
