// models/Supplier.ts
import mongoose, { Schema, models } from "mongoose";

export type SupplierStatus = "pending" | "closed" | "done";

const SupplierSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    /* ספק */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "venue",
        "catering",
        "dj",
        "photography",
        "lighting",
        "design",
        "production",
        "other",
      ],
    },

    /* איש קשר */
    contactName: {
      type: String,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    /* כסף */
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* לו״ז */
    arrivalTime: {
      type: Date,
    },

    /* סטטוס */
    status: {
      type: String,
      enum: ["pending", "closed", "done"],
      default: "pending",
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default models.Supplier || mongoose.model("Supplier", SupplierSchema);
