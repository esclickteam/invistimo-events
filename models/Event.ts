import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    /* =========================
       בעלות / משתמש
    ========================= */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    /* =========================
       פרטי האירוע
    ========================= */
    eventType: {
      type: String,
      default: "Event",
    },

    title: {
      type: String,
      default: "",
    },

    date: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    /* =========================
       מגבלות חבילה
    ========================= */
    maxGuests: {
      type: Number,
      required: true,
    },

    /* =========================
       Stripe (חד־פעמי)
    ========================= */
    stripeSessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    stripePriceId: {
      type: String,
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["paid", "refunded"],
      default: "paid",
    },

    /* =========================
       סטטוס מערכת
    ========================= */
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Event || mongoose.model("Event", EventSchema);
