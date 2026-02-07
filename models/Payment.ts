import mongoose, { Schema, Document } from "mongoose";

/* ============================================================
   TYPES
============================================================ */
export interface PaymentDocument extends Document {
  email: string;

  // 🔗 Stripe (אופציונלי – לא כל תשלום עובר דרך Stripe)
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;

  // 💳 חבילה / מוצר
  priceKey?: string;
  maxGuests: number;

  // ☎️ שירות שיחות
  includeCalls: boolean;
  callsAddonPrice: number;

  // 🎁 מתנות באשראי
  includeCreditGifts: boolean;
  creditGiftsAddonPrice: number;

  // 💰 סכומים
  amount: number;
  refundAmount: number;
  currency: string;

  // 🧾 סוג תשלום
  type: "package" | "addon" | "upgrade";

  // 🧠 מידע נוסף
  metadata?: Record<string, any>;

  // 📌 סטטוס
  status: "paid" | "refunded" | "partially_refunded" | "failed";

  // 🔥 בדיקה
  isTest: boolean;

  // 🕒 זיכוי
  refundedAt?: Date;
  refundReason?: string;

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
      index: true,
    },

    /* =========================
       Stripe (אופציונלי!)
       ❌ לא required
       ❌ לא unique
       ❌ לא index
       ✔️ האינדקס מנוהל ידנית ב־MongoDB
    ========================= */
    stripeSessionId: {
      type: String,
      default: undefined,
    },

    stripePaymentIntentId: {
      type: String,
      default: undefined,
    },

    stripeCustomerId: {
      type: String,
      default: undefined,
    },

    stripePriceId: {
      type: String,
      default: undefined,
    },

    /* =========================
       Package / Product
    ========================= */
    priceKey: {
  type: String,
  required: false,   // ✅ לא חובה
  index: true,
},

    maxGuests: {
      type: Number,
      default: 0,
    },

    /* =========================
       ☎️ Calls
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
       🎁 Credit Gifts
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
       💰 Amounts
    ========================= */
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "ils",
    },

    /* =========================
       🧾 Type
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
      default: undefined,
    },

    /* =========================
       Status
    ========================= */
    status: {
      type: String,
      enum: ["paid", "refunded", "partially_refunded", "failed"],
      default: "paid",
      index: true,
    },

    /* =========================
       Refund info
    ========================= */
    refundedAt: {
      type: Date,
      default: undefined,
    },

    refundReason: {
      type: String,
      trim: true,
      default: undefined,
    },

    /* =========================
       Test payments
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
   VIRTUAL – NET AMOUNT
============================================================ */
PaymentSchema.virtual("netAmount").get(function (this: PaymentDocument) {
  return Math.max(0, this.amount - (this.refundAmount || 0));
});

/* ============================================================
   ❌ אין אינדקסים כאן
   ✔️ האינדקס ל־stripeSessionId מנוהל ידנית ב־MongoDB:
   
   db.payments.createIndex(
     { stripeSessionId: 1 },
     {
       unique: true,
       partialFilterExpression: {
         stripeSessionId: { $exists: true, $ne: "" }
       }
     }
   )
============================================================ */

export default mongoose.models.Payment ||
  mongoose.model<PaymentDocument>("Payment", PaymentSchema);