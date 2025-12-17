import mongoose, { Schema, models, model } from "mongoose";
import { nanoid } from "nanoid";

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
      default: "הזמנה חדשה", // ✅ ברירת מחדל כדי לא לחסום יצירת טיוטה
    },

    eventType: {
      type: String, // חתונה / בר מצווה / וכו'
      default: "",
    },

    eventDate: {
      type: Date,
      default: null,
    },

    // ✅ שעה מדויקת
    eventTime: {
      type: String, // "19:30"
      default: "",
    },

    // ✅ מיקום האירוע
    eventLocation: {
      type: String,
      default: "",
    },

    /* ================= DESIGN ================= */
    canvasData: {
      type: Object,
      required: true,
      default: {}, // ✅ מאפשר ליצור גם בלי עיצוב עדיין
    },

    previewImage: {
      type: String,
      default: "",
    },

    shareId: {
      type: String,
      unique: true,
      default: () => nanoid(10), // ✅ קישור ציבורי להזמנה
    },

    /* ================= GUESTS ================= */
    guests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InvitationGuest",
      },
    ],

    /* ================= SMS PACKAGE ================= */
    maxGuests: {
      type: Number,
      enum: [100, 300, 500, 1000],
      default: 100,
      required: true,
    },

    sentSmsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default models.Invitation || model("Invitation", InvitationSchema);
