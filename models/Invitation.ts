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
    creditEnabled: { type: Boolean, default: false },
    creditUrl: { type: String, default: "" },

    payboxEnabled: { type: Boolean, default: false },
    payboxUrl: { type: String, default: "" },
  },
  { _id: false }
);

/* ================= INVITATION SETTINGS SUB-SCHEMA ================= */

const InvitationSettingsSchema = new Schema(
  {
    showStoryAfterConfirm: {
      type: Boolean,
      default: false,
    },

    showGiftLinkAfterConfirm: {
      type: Boolean,
      default: false,
    },

    allowGuestNote: {
      type: Boolean,
      default: false,
    },

    menuOptions: {
      vegetarian: { type: Boolean, default: false },
      vegan: { type: Boolean, default: false },
      glutenFree: { type: Boolean, default: false },
      childrenMeal: { type: Boolean, default: false },
      kosher: { type: Boolean, default: false },
      kosherGlatt: { type: Boolean, default: false },
      kosherMahfoud: { type: Boolean, default: false },
      transportation: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

/* ================= INVITATION SCHEMA ================= */

const InvitationSchema = new Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    producerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

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

    /* ================= GIFT OPTIONS ================= */

    giftOptions: {
      type: GiftOptionsSchema,
      default: () => ({}),
    },

    /* ================= INVITATION SETTINGS ================= */

    invitationSettings: {
      type: InvitationSettingsSchema,
      default: () => ({}),
    },

    /* ================= SMS STATE ================= */

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

    reminderSentAt: {
      type: Date,
      default: null,
      index: true,
    },

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

/* ================= PRE SAVE CLEANUP ================= */

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

InvitationSchema.index({ eventId: 1 }, { unique: true });

/* ================= MODEL ================= */

export default models.Invitation ||
  model("Invitation", InvitationSchema);
