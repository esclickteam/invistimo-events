import mongoose, { Schema, model, models } from "mongoose";

const QuoteItemSchema = new Schema(
  {
    title: String,
    description: String,
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

    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    quoteNumber: { type: String, default: "" },
    items: [QuoteItemSchema],

    total: { type: Number, default: 0 },
    validUntil: { type: Date },

    status: {
      type: String,
      enum: ["draft", "sent", "opened", "approved", "expired", "cancelled", "converted"],
      default: "draft",
      index: true,
    },

    publicToken: { type: String, index: true },
  },
  { timestamps: true }
);

export default models.CustomerQuote || model("CustomerQuote", CustomerQuoteSchema);