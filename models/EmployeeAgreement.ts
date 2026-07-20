import mongoose, { Schema, models, model } from "mongoose";

import {
  DEFAULT_TEMPLATE_TYPE,
} from "@/lib/employeeAgreementTemplateTypes";

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

    templateType: {
      type: String,
      enum: ["phone_representative_agreement", "termination_request"],
      default: DEFAULT_TEMPLATE_TYPE,
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
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "signed", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    sentByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    signedAt: {
      type: Date,
      default: null,
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

    employeeDeletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

EmployeeAgreementSchema.index(
  { employeeId: 1, businessId: 1, templateType: 1 },
  { unique: true }
);

export default models.EmployeeAgreement ||
  model("EmployeeAgreement", EmployeeAgreementSchema);