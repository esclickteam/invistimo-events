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

    x: {
      type: Number,
      required: true,
    },

    y: {
      type: Number,
      required: true,
    },

    width: {
      type: Number,
      required: true,
    },

    height: {
      type: Number,
      required: true,
    },

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
       בעלות / משתמש (הלקוח)
    ========================= */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* =========================
       מפיק שפתח את האירוע (אופציונלי)
    ========================= */
    producerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
        "other",
      ],
      default: "wedding",
    },

    title: {
      type: String,
      default: "",
      trim: true,
    },

    /* =========================
       תאריך ושעה
       ✔ תואם input type="date"
       ✔ תואם input type="time"
    ========================= */
    date: {
      type: String, // yyyy-mm-dd
      required: true,
    },

    time: {
      type: String, // HH:mm
      default: "",
    },

    /* =========================
       מיקום (תואם LocationAutocomplete)
    ========================= */
    location: {
      address: {
        type: String,
        default: "",
        trim: true,
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

    /* =========================
       אזורים (חופה / במה / רחבה)
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
      default: null,
      index: true,
    },

    stripePriceId: {
      type: String,
      default: null,
    },

    /* =========================
       תשלום
    ========================= */
    paymentStatus: {
      type: String,
      enum: ["paid", "refunded"],
      default: "paid",
      index: true,
    },

    /* =========================
       סטטוס מערכת
    ========================= */
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================================================
   Partial Unique Index ל-stripeSessionId
========================================================= */
EventSchema.index(
  { stripeSessionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      stripeSessionId: { $type: "string" },
    },
  }
);

export default mongoose.models.Event ||
  mongoose.model("Event", EventSchema);
