import mongoose, { Schema, models, model } from "mongoose";
import { nanoid } from "nanoid";

/* ================= LOCATION SUB-SCHEMA ================= */

const LocationSchema = new Schema(
  {
    name: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    lat: {
      type: Number,
      default: null,
    },
    lng: {
      type: Number,
      default: null,
    },
  },
  { _id: false } // ⬅️ חשוב – לא ליצור _id פנימי
);

/* ================= INVITATION SCHEMA ================= */

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

    /* ================= LOCATION ================= */
    location: {
      type: LocationSchema,
      default: () => ({}),
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

    /* ================= SHARE ================= */
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
    maxGuests: {
      type: Number,
      default: 100,
      required: true,
    },

    /* ================= SMS ================= */
    sentSmsCount: {
      type: Number,
      default: 0,
    },

    maxMessages: {
      type: Number,
      default: function () {
        return (this.maxGuests || 100) * 3;
      },
    },

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
