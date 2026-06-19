import mongoose, { Schema, model, models } from "mongoose";

const CustomerAgreementSchema = new Schema(
  {
    customerFileId: {
      type: Schema.Types.ObjectId,
      ref: "CustomerFile",
      required: true,
      index: true,
    },

    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    title: { type: String, default: "הסכם שירותים" },
    amount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["draft", "sent", "signed", "cancelled"],
      default: "draft",
      index: true,
    },

    signedAt: { type: Date },
    signerName: { type: String, default: "" },
    signerIdNumber: { type: String, default: "" },
    signerEmail: { type: String, default: "" },
    signerPhone: { type: String, default: "" },

    signatureText: { type: String, default: "" },
    signatureImageUrl: { type: String, default: "" },

    ipAddress: { type: String, default: "" },

    publicToken: { type: String, index: true },
    pdfUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export default models.CustomerAgreement ||
  model("CustomerAgreement", CustomerAgreementSchema);