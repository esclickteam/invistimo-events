import mongoose, { Schema, models, model } from "mongoose";

const InvitationSchema = new Schema(
  {
    /* ================= OWNER ================= */

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* ================= EVENT INFO ================= */

    title: {
      type: String,
      required: true,
    },

    eventType: {
      type: String, // חתונה / בר מצווה / וכו'
    },

    eventDate: {
      type: Date,
    },

    /* ================= DESIGN ================= */

    canvasData: {
      type: Object,
      required: true, // כל האובייקטים מהעורך
    },

    previewImage: {
      type: String, // תמונת תצוגה
    },

    shareId: {
      type: String,
      unique: true, // קישור ציבורי להזמנה
    },

    /* ================= GUESTS ================= */

    guests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InvitationGuest",
      },
    ],

    /* ================= SMS PACKAGE ================= */

    // 🔐 החבילה שנרכשה: 100 / 300 / 500 / 1000
    maxGuests: {
      type: Number,
      required: true,
      enum: [100, 300, 500, 1000],
    },

    // 📩 כמה הודעות SMS כבר נשלחו
    sentSmsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default models.Invitation ||
  model("Invitation", InvitationSchema);
