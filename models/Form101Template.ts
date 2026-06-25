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
      trim: true,
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

    digitSpacingMode: {
      type: String,
      enum: ["equal", "group", "custom", "date"],
      default: "equal",
    },

    digitGaps: {
      type: [Number],
      default: [],
    },

    digitGroupSize: {
      type: Number,
      default: null,
    },

    digitGroupSizeMode: {
      type: String,
      enum: ["auto", "manual"],
      default: "auto",
    },

    digitGroupGap: {
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

    dependsOnKey: {
      type: String,
      default: "",
      trim: true,
    },

    showWhenValue: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const Form101TemplatePageSchema = new Schema(
  {
    pageIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    pageNumber: {
      type: Number,
      required: true,
      enum: [1, 2],
    },

    url: {
      type: String,
      default: "/forms/tofes-101.pdf",
      trim: true,
    },

    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },

    name: {
      type: String,
      default: "",
      trim: true,
    },

    type: {
      type: String,
      enum: ["image", "pdf"],
      default: "image",
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

    fileUrl: {
      type: String,
      default: "/forms/tofes-101.pdf",
      trim: true,
    },

    originalFileName: {
      type: String,
      default: "tofes-101.pdf",
      trim: true,
    },

    originalFileType: {
      type: String,
      enum: ["pdf", "image"],
      default: "pdf",
    },

    pageCount: {
      type: Number,
      default: 2,
      min: 1,
      max: 2,
    },

    pages: {
      type: [Form101TemplatePageSchema],
      default: [],
    },

    coordinateMode: {
      type: String,
      enum: ["pixels", "percent"],
      default: "pixels",
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

Form101TemplateSchema.index({
  taxYear: 1,
  isActive: 1,
  updatedAt: -1,
});

export default models.Form101Template ||
  model("Form101Template", Form101TemplateSchema);
