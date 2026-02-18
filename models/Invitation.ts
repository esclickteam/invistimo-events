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

/* ================= GIFT OPTIONS SUB-SCHEMA ================= */

const GiftOptionsSchema = new Schema(
  {
    // ✅ צ'קבוקס: מתנה באשראי
    creditEnabled: { type: Boolean, default: false },
    // קישור לתשלום באשראי
    creditUrl: { type: String, default: "" },

    // ✅ צ'קבוקס: מתנה ב-PayBox
    payboxEnabled: { type: Boolean, default: false },
    // קישור PayBox
    payboxUrl: { type: String, default: "" },
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

    previewImage: {
      type: String,
      default: "",
    },

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

    /* ================= SMS USAGE ================= */

    sentSmsCount: {
      type: Number,
      default: 0,
    },

    /* ================= GIFT OPTIONS =================
       מוצג בעמוד ההזמנה מתחת לאישור הגעה
       לפי מה שבעל האירוע מפעיל בדשבורד
    ================================================ */

    giftOptions: {
      type: GiftOptionsSchema,
      default: () => ({}),
    },

    /* =====================================================
       ================== SMS STATE ==================
       null  → טרם נשלח
       Date → נשלח
    ===================================================== */

    /* ===== RSVP ===== */

    rsvpRound1SentAt: {
      type: Date,
      default: null,
      index: true,
    },

    rsvpRound2SentAt: {
      type: Date,
      default: null,
      index: true,
    },

    /* ===== REMINDER (תזכורת אחת בלבד) ===== */

    reminderSentAt: {
      type: Date,
      default: null,
      index: true,
    },

    /* ===== THANK YOU (הודעת תודה אחת בלבד) ===== */

    thankYouSentAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ================= VALIDATIONS (SAFE) =================
   אם enabled=true אבל אין קישור → לא נכשיל שמירה,
   אבל נוודא שהקישור נשמר בצורה נקייה.
   (את ה"השבתה" של הכפתור נעשה ב-UI)
====================================================== */

InvitationSchema.pre("save", function () {
  const doc = this as mongoose.Document & {
    giftOptions?: {
      creditEnabled?: boolean;
      creditUrl?: string;
      payboxEnabled?: boolean;
      payboxUrl?: string;
    };
  };

  const g = doc.giftOptions ?? {};

  g.creditUrl = (g.creditUrl ?? "").trim();
  g.payboxUrl = (g.payboxUrl ?? "").trim();

  if (!g.creditEnabled) g.creditUrl = "";
  if (!g.payboxEnabled) g.payboxUrl = "";

  doc.giftOptions = g;
});

/* ================= INDEXES ================= */

// שלא תהיה יותר מהזמנה אחת לאותו Event
InvitationSchema.index({ eventId: 1 }, { unique: true });

// אופציונלי: חיפוש מהיר לפי shareId כבר קיים עם index:true

/* ================= MODEL ================= */

export default models.Invitation || model("Invitation", InvitationSchema);
