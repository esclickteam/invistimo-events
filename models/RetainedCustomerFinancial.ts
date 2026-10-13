import mongoose, { Schema, model, models } from "mongoose";

/**
 * Financial snapshot that does not reference a live User.
 * Revenue reports read it only after the original user record is gone.
 */
const RetainedPaymentSchema = new Schema(
  {
    amount: { type: Number, default: 0 },
    type: { type: String, default: "manual" },
    method: { type: String, default: "manual" },
    status: { type: String, default: "paid" },
    paidAt: { type: Date, default: null },
    createdAt: { type: Date, default: null },
    note: { type: String, default: "" },
    reference: { type: String, default: "" },
    invoiceUrl: { type: String, default: "" },
    receiptUrl: { type: String, default: "" },
  },
  { _id: false }
);

const RetainedLedgerSchema = new Schema(
  {
    sourceId: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "ils" },
    status: { type: String, default: "" },
    type: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    method: { type: String, default: "" },
    reference: { type: String, default: "" },
    invoiceUrl: { type: String, default: "" },
    receiptUrl: { type: String, default: "" },
  },
  { _id: false }
);

const RetainedCustomerFinancialSchema = new Schema(
  {
    originalUserId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    customerDeletedAt: { type: Date, default: null },
    name: { type: String, default: "" },
    fullName: { type: String, default: "" },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    clientName: { type: String, default: "" },
    businessName: { type: String, default: "" },
    email: { type: String, default: "", lowercase: true, trim: true, index: true },
    phone: { type: String, default: "" },
    idNumber: { type: String, default: "" },
    plan: { type: String, default: "" },
    priceKey: { type: String, default: "" },
    packageName: { type: String, default: "" },
    planName: { type: String, default: "" },
    subscriptionPlan: { type: String, default: "" },
    maxGuests: { type: Number, default: 0 },
    includeCalls: { type: Boolean, default: false },
    includeCreditGifts: { type: Boolean, default: false },
    callsAddonPrice: { type: Number, default: 0 },
    creditGiftsAddonPrice: { type: Number, default: 0 },
    isDemoUser: { type: Boolean, default: false },
    isTest: { type: Boolean, default: false },
    hasPaid: { type: Boolean, default: false },
    paidAmount: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    packagePrice: { type: Number, default: 0 },
    planPrice: { type: Number, default: 0 },
    subscriptionPrice: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    totalDealAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    paymentMode: { type: String, default: "none" },
    paidAt: { type: Date, default: null },
    paymentDate: { type: Date, default: null },
    lastPaymentAt: { type: Date, default: null },
    manualPaidAt: { type: Date, default: null },
    subscriptionPaidAt: { type: Date, default: null },
    payments: { type: [RetainedPaymentSchema], default: [] },
    ledgerPayments: { type: [RetainedLedgerSchema], default: [] },
    producerCollectionPayments: { type: [RetainedPaymentSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

export default models.RetainedCustomerFinancial ||
  model("RetainedCustomerFinancial", RetainedCustomerFinancialSchema);
