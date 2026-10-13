import mongoose, { Schema, model, models } from "mongoose";
import {
  buildCustomerAgreementSignedCopy,
  freezeSignedSnapshot,
  rejectProtectedSignedUpdate,
  restoreFrozenSignedContent,
} from "@/lib/customers/signedAgreementLock";

const CustomerAgreementSchema = new Schema(
  {
    customerFileId: {
      type: Schema.Types.ObjectId,
      ref: "CustomerFile",
      required: true,
      index: true,
    },

    // לא חובה — כי הסכם יכול להיווצר ללקוח חדש לפני שנפתח לו משתמש במערכת
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },

    title: {
      type: String,
      default: "הסכם שירותים",
      trim: true,
    },

    amount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["draft", "sent", "signed", "cancelled"],
      default: "draft",
      index: true,
    },

    signedAt: {
      type: Date,
      default: null,
      index: true,
    },

    signerName: {
      type: String,
      default: "",
      trim: true,
    },

    signerIdNumber: {
      type: String,
      default: "",
      trim: true,
    },

    signerEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    signerPhone: {
      type: String,
      default: "",
      trim: true,
    },

    signatureText: {
      type: String,
      default: "",
      trim: true,
    },

    // כאן נשמרת חתימה מצוירת / base64 / url אם קיימת
    signatureImageUrl: {
      type: String,
      default: "",
    },

    ipAddress: {
      type: String,
      default: "",
      trim: true,
    },

    publicToken: {
      type: String,
      default: "",
      index: true,
    },

    pdfUrl: {
      type: String,
      default: "",
    },

    // קישור למסמך המקורי שנוצר דרך SalesDocument
    salesDocumentId: {
      type: Schema.Types.ObjectId,
      ref: "SalesDocument",
      required: false,
      default: null,
      index: true,
    },

    customerDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    customerDeletedAt: {
      type: Date,
      default: null,
    },

    originalUserId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    immutableSignedCopy: {
      type: Schema.Types.Mixed,
      default: undefined,
    },

    immutableSignedCopyFrozenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

CustomerAgreementSchema.pre("save", async function () {
  freezeSignedSnapshot(this, buildCustomerAgreementSignedCopy);
  restoreFrozenSignedContent(this);
});

async function guardSignedCustomerAgreement(this: any) {
  await rejectProtectedSignedUpdate(this);
}

CustomerAgreementSchema.pre("updateOne", guardSignedCustomerAgreement);
CustomerAgreementSchema.pre("updateMany", guardSignedCustomerAgreement);
CustomerAgreementSchema.pre("findOneAndUpdate", guardSignedCustomerAgreement);
CustomerAgreementSchema.pre("replaceOne", guardSignedCustomerAgreement);

export default models.CustomerAgreement ||
  model("CustomerAgreement", CustomerAgreementSchema);