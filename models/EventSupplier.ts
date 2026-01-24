// models/EventSupplier.js
import mongoose from "mongoose";

const EventSupplierSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    category: {
      type: String,
      required: true,
    },

    sub: {
      type: String,
      required: true,
    },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    price: {
      type: Number,
      default: 0,
    },

    advance: {
      type: Number,
      default: 0,
    },

    balance: {
      type: Number,
      default: 0,
    },

    /* =========================
       📎 קבצים (Cloudinary)
    ========================= */
    files: [
      {
        name: {
          type: String,
          required: true,
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
  { timestamps: true }
);

export default mongoose.models.EventSupplier ||
  mongoose.model("EventSupplier", EventSupplierSchema);
