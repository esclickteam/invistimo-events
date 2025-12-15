import mongoose from "mongoose";

/* =========================
   ZONE SUB-SCHEMA
========================= */
const ZoneSchema = new mongoose.Schema(
  {
    zoneType: {
      type: String,
      required: true,
      enum: [
        "chuppah",
        "stage",
        "dancefloor",
        "reception",
        "photo-area",
        "brit-area",
        "henna-stage",
        "bride-groom-seat",
      ],
    },

    label: {
      type: String,
      required: true,
    },

    icon: {
      type: String,
      required: true,
    },

    color: {
      type: String,
      required: true,
    },

    opacity: {
      type: Number,
      default: 0.25,
    },

    x: { type: Number, required: true },
    y: { type: Number, required: true },

    width: { type: Number, required: true },
    height: { type: Number, required: true },

    rotation: {
      type: Number,
      default: 0,
    },

    locked: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

/* =========================
   EVENT SCHEMA
========================= */
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
      enum: [
        "wedding",
        "bar-mitzvah",
        "bat-mitzvah",
        "brit",
        "brita",
        "henna",
      ],
      required: true,
      index: true,
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
       אזורים (במה / חופה / רחבה)
    ========================= */
    zones: {
      type: [ZoneSchema],
      default: [],
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
  {
    timestamps: true,
  }
);

export default mongoose.models.Event ||
  mongoose.model("Event", EventSchema);
