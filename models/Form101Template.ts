import mongoose, { Schema, model, models } from "mongoose";

const Form101FieldSchema = new Schema(
  {
    page: {
      type: Number,
      enum: [1, 2],
      required: true,
    },

    section: {
      type: String,
      required: true,
      trim: true,
    },

    order: {
      type: Number,
      required: true,
      default: 1,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    isFixed: {
      type: Boolean,
      default: false,
    },

    fixedValue: {
      type: String,
      default: "",
    },

    label: {
      type: String,
      default: "",
    },

    x: {
      type: Number,
      required: true,
    },

    y: {
      type: Number,
      required: true,
    },

    width: {
      type: Number,
      required: true,
    },

    height: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: ["text", "digits", "check", "signature"],
      required: true,
    },

    fontSize: {
      type: Number,
      required: true,
      default: 14,
    },

    digitGap: {
      type: Number,
      default: null,
    },

    maxDigits: {
      type: Number,
      default: null,
    },

    align: {
      type: String,
      enum: ["right", "left", "center"],
      default: "right",
    },
  },
  {
    _id: false,
  }
);

const Form101TemplateSchema = new Schema(
  {
    name: {
      type: String,
      default: "default",
      trim: true,
      index: true,
    },

    taxYear: {
      type: Number,
      default: null,
      index: true,
    },

    fields: {
      type: Map,
      of: Form101FieldSchema,
      default: {},
    },

    pageWidth: {
      type: Number,
      default: 900,
    },

    pageHeight: {
      type: Number,
      default: 1280,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

Form101TemplateSchema.index({
  name: 1,
  isActive: 1,
  createdAt: -1,
});

export default models.Form101Template ||
  model("Form101Template", Form101TemplateSchema);
