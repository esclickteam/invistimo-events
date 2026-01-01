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
  stripePriceId?: string; // (לפעמים יש, לפעמים לא כשעובדים עם price_data)

  // 💳 חבילה / מוצר
  priceKey: string; // basic_plan_49 | premium_200_v2 | extra_messages_500 | upgrade וכו'
  maxGuests: number;

  // ✅ תוספת שירות שיחות (3 סבבים)
  includeCalls: boolean;
  callsAddonPrice: number;

  // 💰 סכום
  amount: number; // בשקלים
  currency: string; // ils

  // 🧾 מידע נוסף (לא חובה, אבל מציל חיים לדיבאג)
  type: "package" | "addon" | "upgrade";
  metadata?: Record<string, any>;

  status: "paid" | "refunded" | "failed";

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
      unique: true, // 🛑 הגנה מכפילויות webhook (Session unique)
      index: true,
    },

    stripePaymentIntentId: {
      type: String,
      index: true, // ✅ גם זה טוב להגנה
    },

    stripeCustomerId: { type: String },
    stripePriceId: { type: String },

    priceKey: {
      type: String,
      required: true,
      // ✅ לא חוסמים enum כדי לא להיתקע כשנוספות אופציות (addon/upgrade/דינמי)
      // אם את מתעקשת על enum, תצטרכי להוסיף גם:
      // extra_messages_500, premium_300_upgrade, וכו'
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
  },
  { timestamps: true }
);

export default mongoose.models.Payment ||
  mongoose.model<PaymentDocument>("Payment", PaymentSchema);
