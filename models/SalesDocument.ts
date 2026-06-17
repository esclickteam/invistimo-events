import mongoose, { Schema, model, models } from "mongoose";

export type SalesDocumentType = "quote" | "agreement";
export type SalesDocumentStatus = "draft" | "sent" | "viewed" | "signed" | "expired";

const AnySchema = Schema.Types.Mixed;

const SalesDocumentSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["quote", "agreement"],
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "signed", "expired"],
      default: "draft",
      index: true,
    },
    url: { type: String, default: "" },

    client: {
      fullName: { type: String, default: "" },
      idNumber: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      address: { type: String, default: "" },
    },

    event: {
      name: { type: String, default: "" },
      date: { type: String, default: "" },
      city: { type: String, default: "" },
      venueName: { type: String, default: "" },
    },

    quote: {
      createdAt: { type: String, default: "" },
      expiresAt: { type: String, default: "" },
      validityDays: { type: Number, default: 4 },
    },

    selectedPackage: {
      key: { type: String, default: "" },
      title: { type: String, default: "" },
      customerSummary: { type: String, default: "" },
      includes: { type: [String], default: [] },
      records: { type: Number, default: 0 },
      price: { type: Number, default: 0 },
    },

    upsells: { type: [AnySchema], default: [] },

    totals: {
      grossAmount: { type: Number, default: 0 },
      netAmount: { type: Number, default: 0 },
      vatRate: { type: Number, default: 0.18 },
      paymentMode: { type: String, default: "split" },
      paymentSchedule: { type: AnySchema, default: {} },
    },

    customerDealSummary: { type: AnySchema, default: {} },
    cancellationTerms: { type: [AnySchema], default: [] },
    paymentTerms: { type: [AnySchema], default: [] },

    signature: {
      fullName: { type: String, default: "" },
      idNumber: { type: String, default: "" },
      address: { type: String, default: "" },
      phone: { type: String, default: "" },
      date: { type: String, default: "" },
      signatureText: { type: String, default: "" },
      signedAt: { type: Date, default: null },
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
    },

    sms: {
      sentAt: { type: Date, default: null },
      sentTo: { type: String, default: "" },
      lastError: { type: String, default: "" },
    },

    viewedAt: { type: Date, default: null },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  },
  { timestamps: true },
);

SalesDocumentSchema.index({ type: 1, status: 1, createdAt: -1 });

const SalesDocument =
  models.SalesDocument || model("SalesDocument", SalesDocumentSchema);

export default SalesDocument;
