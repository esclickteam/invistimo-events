import mongoose, { Schema, model, models } from "mongoose";

const ExtraChargeSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, default: "", trim: true },
    quantity: { type: Number, default: 0, min: 0 },
    unitPrice: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const VenueEventPaymentSchema = new Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    hallId: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },
    estimatedGuests: {
      type: Number,
      default: 0,
      min: 0,
    },
    reserveGuests: {
      type: Number,
      default: 0,
      min: 0,
    },
    pricePerGuest: {
      type: Number,
      default: 0,
      min: 0,
    },
    actualGuests: {
      type: Number,
      default: 0,
      min: 0,
    },
    advancePayment: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    extras: {
      type: [ExtraChargeSchema],
      default: [],
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "closed"],
      default: "draft",
      index: true,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const VenueEventPayment =
  models.VenueEventPayment || model("VenueEventPayment", VenueEventPaymentSchema);

export default VenueEventPayment;
