import mongoose, { Schema, models, model } from "mongoose";

const EmployeeAgreementSchema = new Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    values: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },

    fullName: {
      type: String,
      default: "",
      trim: true,
    },

    idNumber: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      default: "",
      trim: true,
    },

    agreementDate: {
      type: Date,
      default: null,
    },

    startDate: {
      type: Date,
      default: null,
    },

    finalFullName: {
      type: String,
      default: "",
      trim: true,
    },

    finalIdNumber: {
      type: String,
      default: "",
      trim: true,
    },

    finalSignatureDate: {
      type: Date,
      default: null,
    },

    signedFileUrl: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["signed", "approved", "rejected"],
      default: "signed",
      index: true,
    },

    signedAt: {
      type: Date,
      default: Date.now,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

EmployeeAgreementSchema.index(
  { employeeId: 1, businessId: 1 },
  { unique: true }
);

export default models.EmployeeAgreement ||
  model("EmployeeAgreement", EmployeeAgreementSchema);