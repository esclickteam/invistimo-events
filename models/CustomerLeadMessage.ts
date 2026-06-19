import mongoose, { Schema, model, models } from "mongoose";

const CustomerLeadMessageSchema = new Schema(
  {
    customerFileId: {
      type: Schema.Types.ObjectId,
      ref: "CustomerFile",
      required: true,
      index: true,
    },

    staffId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    direction: {
      type: String,
      enum: ["incoming", "outgoing"],
      required: true,
      index: true,
    },

    channel: {
      type: String,
      enum: ["whatsapp"],
      default: "whatsapp",
      index: true,
    },

    from: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    to: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    messageText: {
      type: String,
      default: "",
      trim: true,
    },

    provider: {
      type: String,
      default: "360dialog",
      trim: true,
      index: true,
    },

    providerMessageId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "read", "failed", "received"],
      default: "pending",
      index: true,
    },

    errorMessage: {
      type: String,
      default: "",
      trim: true,
    },

    rawPayload: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

CustomerLeadMessageSchema.index({ customerFileId: 1, createdAt: -1 });
CustomerLeadMessageSchema.index({ from: 1, to: 1, createdAt: -1 });
CustomerLeadMessageSchema.index({ providerMessageId: 1 });

export default models.CustomerLeadMessage ||
  model("CustomerLeadMessage", CustomerLeadMessageSchema);