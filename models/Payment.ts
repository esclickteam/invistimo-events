import mongoose, { Schema, Document } from "mongoose";

/* ============================================================
   TYPES
============================================================ */
export interface PaymentDocument extends Document {
  email: string;

  // 🔗 Stripe
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;

  // 💳 חבילה / מוצר
  priceKey: string;
  maxGuests: number;

  // ☎️ שירות שיחות (3 סבבים)
  includeCalls: boolean;
  callsAddonPrice: number;

  // 🎁 מתנות באשראי
  includeCreditGifts: boolean;
  creditGiftsAddonPrice: number;

  // 💰 סכום כולל ששולם בפועל
  amount: number;
  currency: string;

  // 🧾 סוג תשלום
  type: "package" | "addon" | "upgrade";

  // 🧠 מידע נוסף מ־Stripe / חישובים
  metadata?: Record<string, any>;

  status: "paid" | "refunded" | "failed";

  // 🔥 תשלום בדיקה (Stripe test mode)
  isTest: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/* ============================================================
   SCHEMA
============================================================ */
const PaymentSchema = new Schema<PaymentDocument>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    stripeSessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    stripePaymentIntentId: {
      type: String,
      index: true,
    },

    stripeCustomerId: {
      type: String,
    },

    stripePriceId: {
      type: String,
    },

    priceKey: {
      type: String,
      required: true,
    },

    maxGuests: {
      type: Number,
      required: true,
      default: 0,
    },

    /* =========================
       ☎️ שירות שיחות
    ========================= */
    includeCalls: {
      type: Boolean,
      default: false,
    },

    callsAddonPrice: {
      type: Number,
      default: 0,
    },

    /* =========================
       🎁 מתנות באשראי
    ========================= */
    includeCreditGifts: {
      type: Boolean,
      default: false,
    },

    creditGiftsAddonPrice: {
      type: Number,
      default: 0,
    },

    /* =========================
       💰 סכום
    ========================= */
    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "ils",
    },

    /* =========================
       🧾 סוג תשלום
    ========================= */
    type: {
      type: String,
      enum: ["package", "addon", "upgrade"],
      default: "package",
    },

    /* =========================
       🧠 Metadata
    ========================= */
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    /* =========================
       סטטוס
    ========================= */
    status: {
      type: String,
      enum: ["paid", "refunded", "failed"],
      default: "paid",
    },

    /* =========================
       🔥 בדיקות Stripe
    ========================= */
    isTest: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ============================================================
   MODEL
============================================================ */
export default mongoose.models.Payment ||
  mongoose.model<PaymentDocument>("Payment", PaymentSchema);
