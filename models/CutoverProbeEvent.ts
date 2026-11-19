import mongoose, { Schema, model, models } from "mongoose";

/**
 * Isolated log for the single RSVP cutover probe.
 * Rows here are not guests, leads, events, or RSVP status.
 */
const CutoverProbeEventSchema = new Schema(
  {
    probeId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ["registration", "message", "status"],
      required: true,
    },
    wamid: { type: String, required: true },
    contextWamid: { type: String, default: "" },
    direction: { type: String, enum: ["inbound", "outbound"], required: true },
    providerStatus: { type: String, default: "" },
    duplicate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CutoverProbeEventSchema.index(
  { probeId: 1, role: 1, wamid: 1, providerStatus: 1 },
  { unique: true }
);

export default models.CutoverProbeEvent ||
  model("CutoverProbeEvent", CutoverProbeEventSchema);
