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
      default: undefined,
      index: true,
    },

    /* =========================
       עובדים מוקצים לאירוע
    ========================= */
    assignedStaffIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    /* =========================
       חיבור לאולם / מתחם
       אופציונלי כדי לא לשבור אירועים קיימים
    ========================= */
    venueOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
      index: true,
    },

    venueHallId: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    venueHallName: {
      type: String,
      default: "",
      trim: true,
    },

    venueLinkedAt: {
      type: Date,
      default: undefined,
    },

    venueAccessStatus: {
      type: String,
      enum: ["none", "linked", "disabled"],
      default: "none",
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
       תקציב הפקה
    ========================= */
    budgetTotal: {
      type: Number,
      default: 0,
    },

    /* =========================
       כמות מוזמנים משוערת
       ידני בלבד — הלקוח מזין בתמונת מצב
    ========================= */
    estimatedGuests: {
      type: Number,
      default: null,
    },

    estimatedGuestCount: {
      type: Number,
      default: null,
    },

    /* =========================
       תאריך ושעה
    ========================= */
    date: {
      type: String,
      required: true,
    },

    time: {
      type: String,
      default: "",
    },

    /* =========================
       מיקום
    ========================= */
    location: {
      address: {
        type: String,
        default: "",
        trim: true,
      },
      lat: {
        type: Number,
        default: undefined,
      },
      lng: {
        type: Number,
        default: undefined,
      },
    },

    /* =========================
       מתנות באשראי
    ========================= */
    giftCreditUrl: {
      type: String,
      default: "",
      trim: true,
    },

    /* =========================
       אזורים
    ========================= */
    zones: {
      type: [ZoneSchema],
      default: [],
    },

    planning: {
      eventDefinition: {
        goal: { type: String, default: "" },
        vibe: { type: String, default: "" },
        size: { type: String, default: "" },
        notes: { type: String, default: "" },
      },
      concept: {
        type: String,
        default: "",
      },
    },

    /* =========================
       מגבלות חבילה
    ========================= */
    maxGuests: {
      type: Number,
      required: true,
    },

    /* =========================
       Stripe
    ========================= */
    stripeSessionId: {
      type: String,
      default: undefined,
    },

    stripePriceId: {
      type: String,
      default: undefined,
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

/* =========================
   INDEXES
========================= */

/* סינון מהיר לעובדי מפיק */
EventSchema.index({ producerId: 1, assignedStaffIds: 1, status: 1 });

/* סינון אירועים לפי אולם / מתחם */
EventSchema.index({ venueOwnerId: 1, status: 1, date: 1 });
EventSchema.index({ venueOwnerId: 1, venueHallId: 1, status: 1, date: 1 });
EventSchema.index({ venueOwnerId: 1, venueAccessStatus: 1, date: 1 });

/* סינון רגיל של אירועי לקוח */
EventSchema.index({ userId: 1, status: 1, date: 1 });

export default mongoose.models.Event || mongoose.model("Event", EventSchema);