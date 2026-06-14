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

    /**
     * שדות מיקום נשמרים באחוזים:
     * x/y/width/height = 0 עד 100
     */
    x: {
      type: Number,
      default: 38,
      min: 0,
      max: 100,
    },

    y: {
      type: Number,
      default: 35,
      min: 0,
      max: 100,
    },

    width: {
      type: Number,
      default: 22,
      min: 1,
      max: 100,
    },

    height: {
      type: Number,
      default: 6,
      min: 1,
      max: 100,
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

const EmployeeAgreementTemplatePageSchema = new Schema(
  {
    pageIndex: {
      type: Number,
      default: 0,
      min: 0,
    },

    pageNumber: {
      type: Number,
      default: 1,
      min: 1,
    },

    url: {
      type: String,
      default: "",
      trim: true,
    },

    /**
     * תמונת עמוד איכותית להצגה במקום canvas / iframe
     * לדוגמה:
     * /templates/employee-agreement-invistimo-pages/page-1.png
     */
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

    /**
     * עמודי ההסכם כתמונות איכותיות.
     * חשוב כדי שהעורך יציג כמו הדוגמה שלך — ללא canvas.
     */
    pages: {
      type: [EmployeeAgreementTemplatePageSchema],
      default: [],
    },

    /**
     * מצב קואורדינטות:
     * percent = x/y/width/height באחוזים
     * pixel = תמיכה אחורה, אם נשמרו נתונים ישנים בפיקסלים
     */
    coordinateMode: {
      type: String,
      enum: ["percent", "pixel"],
      default: "percent",
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