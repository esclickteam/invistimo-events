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

  // ✅ תוספת שירות שיחות (3 סבבים)
  includeCalls: boolean;
  callsAddonPrice: number;

  // 💰 סכום
  amount: number;
  currency: string;

  // 🧾 מידע נוסף
  type: "package" | "addon" | "upgrade";
  metadata?: Record<string, any>;

  status: "paid" | "refunded" | "failed";

  // 🔥 חדש – האם תשלום בדיקה
  isTest: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/* ============================================================
   SCHEMA
============================================================ */
const PaymentSchema = new Schema<PaymentDocument>(
  {
    email: { type: String, required: true, trim: true },

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

    stripeCustomerId: { type: String },
    stripePriceId: { type: String },

    priceKey: {
      type: String,
      required: true,
    },

    maxGuests: { type: Number, required: true, default: 0 },

    // ✅ שירות שיחות
    includeCalls: { type: Boolean, default: false },
    callsAddonPrice: { type: Number, default: 0 },

    amount: { type: Number, required: true },
    currency: { type: String, default: "ils" },

    type: {
      type: String,
      enum: ["package", "addon", "upgrade"],
      default: "package",
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    status: {
      type: String,
      enum: ["paid", "refunded", "failed"],
      default: "paid",
    },

    // 🔥 חדש – סינון בדיקות
    isTest: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Payment ||
  mongoose.model<PaymentDocument>("Payment", PaymentSchema);
