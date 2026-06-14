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

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    idNumber: {
      type: String,
      required: true,
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

    startDate: {
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