import mongoose, { Schema, models, model } from "mongoose";

const EmployeeAgreementTemplateFieldSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["text", "date", "signature"],
      default: "text",
      required: true,
    },

    pageIndex: {
      type: Number,
      default: 0,
      min: 0,
    },

    x: {
      type: Number,
      default: 0,
      min: 0,
    },

    y: {
      type: Number,
      default: 0,
      min: 0,
    },

    width: {
      type: Number,
      default: 160,
      min: 20,
    },

    height: {
      type: Number,
      default: 32,
      min: 20,
    },

    required: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    _id: false,
  }
);

const EmployeeAgreementTemplateSchema = new Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    name: {
      type: String,
      default: "תבנית הסכם עבודה",
      trim: true,
    },

    fileUrl: {
      type: String,
      default: "/templates/employee-agreement-invistimo.pdf",
      trim: true,
    },

    pageCount: {
      type: Number,
      default: 11,
      min: 1,
    },

    fields: {
      type: [EmployeeAgreementTemplateFieldSchema],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

EmployeeAgreementTemplateSchema.index({
  businessId: 1,
  isActive: 1,
});

export default models.EmployeeAgreementTemplate ||
  model("EmployeeAgreementTemplate", EmployeeAgreementTemplateSchema);