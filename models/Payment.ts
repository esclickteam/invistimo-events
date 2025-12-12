import mongoose, { Schema, Document } from "mongoose";

export interface PaymentDocument extends Document {
  email: string;

  // 🔗 Stripe
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;

  // 💳 חבילה
  priceKey: string;        // basic | premium_100 | premium_300 | ...
  maxGuests: number;

  // 💰 סכום
  amount: number;          // unit_amount (בשקלים)
  currency: string;        // ils

  status: "paid" | "refunded" | "failed";

  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<PaymentDocument>(
  {
    email: { type: String, required: true },

    stripeSessionId: {
      type: String,
      required: true,
      unique: true, // 🛑 הגנה מכפילויות webhook
    },

    stripePaymentIntentId: { type: String },
    stripeCustomerId: { type: String },

    priceKey: {
  type: String,
  required: true,
  enum: [
    "basic",       // תאימות לאחור (אם כבר נשמרו תשלומים ישנים)
    "basic_plan",  // החדש
    "premium_100",
    "premium_300",
    "premium_500",
    "premium_1000",
  ],
},

    maxGuests: { type: Number, required: true },

    amount: { type: Number, required: true },
    currency: { type: String, default: "ils" },

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
