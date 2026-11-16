import mongoose, { Schema, model, models } from "mongoose";

/**
 * One row per header-display probe. No guest, invitation, phone, or round.
 * Remove this collection with the probe route after the experiment.
 */

const WhatsappHeaderProbeSchema = new Schema(
  {
    mode: {
      type: String,
      enum: ["link", "id"],
      required: true,
      unique: true,
    },
    state: {
      type: String,
      enum: ["reserved", "sent"],
      required: true,
    },
    messageId: { type: String, default: "" },
    httpStatus: { type: Number, default: 0 },
    provider: { type: String, default: "dialog" },
    errorCode: { type: String, default: "" },
    errorMessage: { type: String, default: "" },
    at: { type: Date, default: null },
  },
  { timestamps: false }
);

export default models.WhatsappHeaderProbe ||
  model("WhatsappHeaderProbe", WhatsappHeaderProbeSchema);
