import mongoose, { Schema, models, model } from "mongoose";
import { nanoid } from "nanoid";

/* ================= LOCATION SUB-SCHEMA ================= */

const LocationSchema = new Schema(
  {
    name: { type: String, default: "" },
    address: { type: String, default: "" },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  { _id: false }
);

/* ================= INVITATION SCHEMA ================= */

const InvitationSchema = new Schema(
  {
    /* ================= OWNER ================= */
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* ================= PRODUCER ================= */
    producerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    /* ================= EVENT LINK ================= */
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    /* ================= EVENT SNAPSHOT ================= */
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

    /**
     * 🖼️ previewImage
     * שימוש: תצוגה באתר בלבד
     * פורמט: base64 / canvas export
     */
    previewImage: {
      type: String,
      default: "",
    },

    /**
     * 📲 headerImageUrl
     * שימוש: WhatsApp Media Template בלבד
     * פורמט: URL ציבורי (Cloudinary / HTTPS)
     */
    headerImageUrl: {
      type: String,
      default: "",
    },

    /* ================= SHARE ================= */
    shareId: {
      type: String,
      unique: true,
      index: true,
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

    /* ================= SMS (USAGE ONLY) ================= */
    sentSmsCount: {
      type: Number,
      default: 0,
    },

    /* ================= RSVP STATE ================= */
    /**
     * ⛔ חסימת שליחת אישור הגעה מחדש
     * null  → עוד לא נשלח
     * Date → סבב ראשון נשלח
     */
    rsvpRoundSentAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ================= INDEXES ================= */

// 🔒 מוודא שלא תהיה יותר מהזמנה אחת לאותו Event
InvitationSchema.index({ eventId: 1 }, { unique: true });

/* ================= MODEL ================= */

export default models.Invitation ||
  model("Invitation", InvitationSchema);
