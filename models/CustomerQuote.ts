import mongoose, { Schema, model, models } from "mongoose";

const QuoteItemSchema = new Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const CustomerQuoteSchema = new Schema(
  {
    customerFileId: {
      type: Schema.Types.ObjectId,
      ref: "CustomerFile",
      required: true,
      index: true,
    },

    // לא חובה — כי הצעת מחיר יכולה להיווצר לפני שנפתח ללקוח משתמש
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },

    quoteNumber: {
      type: String,
      default: "",
      trim: true,
    },

    items: {
      type: [QuoteItemSchema],
      default: [],
    },

    total: {
      type: Number,
      default: 0,
    },

    validUntil: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "sent",
        "opened",
        "approved",
        "expired",
        "cancelled",
        "converted",
      ],
      default: "draft",
      index: true,
    },

    publicToken: {
      type: String,
      default: "",
      index: true,
    },

    // קישור למסמך המקורי שנוצר דרך SalesDocument
    salesDocumentId: {
      type: Schema.Types.ObjectId,
      ref: "SalesDocument",
      required: false,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

export default models.CustomerQuote ||
  model("CustomerQuote", CustomerQuoteSchema);