import mongoose, { Schema, models, model } from "mongoose";

const WeddingChallengeEntitlementSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ["EXISTING_EVENT", "STANDALONE_GAME"],
      default: "STANDALONE_GAME",
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    pricePaid: { type: Number, default: 0, min: 0 },
    purchasedAt: { type: Date, default: null },
    maxGuests: { type: Number, default: 800 },
    giveawayPurchased: { type: Boolean, default: false },
    giveawayFee: { type: Number, default: 99 },
    prizeCost: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, default: "", trim: true },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid"],
      default: "pending",
    },
    notes: { type: String, default: "", trim: true },
    stripeCheckoutSessionId: { type: String, default: "", index: true },
    customerName: { type: String, default: "", trim: true },
    customerPhone: { type: String, default: "", trim: true },
    customerEmail: { type: String, default: "", trim: true, lowercase: true },
  },
  { timestamps: true }
);

WeddingChallengeEntitlementSchema.index({ userId: 1, status: 1 });

const WeddingChallengeEntitlement =
  models.WeddingChallengeEntitlement ||
  model("WeddingChallengeEntitlement", WeddingChallengeEntitlementSchema);

export default WeddingChallengeEntitlement;
