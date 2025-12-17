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
      default: "הזמנה חדשה",
    },

    eventType: {
      type: String,
      default: "",
    },

    eventDate: {
      type: Date,
      default: null,
    },

    eventTime: {
      type: String,
      default: "",
    },

    eventLocation: {
      type: String,
      default: "",
    },

    /* ================= DESIGN ================= */
    canvasData: {
      type: Object,
      required: true,
      default: {},
    },

    previewImage: {
      type: String,
      default: "",
    },

    shareId: {
      type: String,
      unique: true,
      default: () => nanoid(10),
    },

    /* ================= GUESTS ================= */
    guests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InvitationGuest",
      },
    ],

    /* ================= LIMITS ================= */

    // כמות אורחים מותרת
    maxGuests: {
      type: Number,
      default: 100,
      required: true,
    },

    /* ================= SMS ================= */

    // כמה SMS נשלחו בפועל
    sentSmsCount: {
      type: Number,
      default: 0,
    },

    // 💬 מקסימום הודעות SMS (3 לכל אורח)
    maxMessages: {
      type: Number,
      default: function () {
        return (this.maxGuests || 100) * 3;
      },
    },

    // 💬 יתרת הודעות SMS
    remainingMessages: {
      type: Number,
      default: function () {
        return (this.maxGuests || 100) * 3;
      },
    },
  },
  {
    timestamps: true,
  }
);

export default models.Invitation ||
  model("Invitation", InvitationSchema);
