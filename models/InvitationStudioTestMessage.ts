import mongoose, { Schema, models, model } from "mongoose";

/**
 * Local record of a simulated guest message.
 * Nothing here calls WhatsApp or SMS providers.
 */
const InvitationStudioTestMessageSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    invitationId: { type: Schema.Types.ObjectId, ref: "Invitation", required: true },
    guestId: { type: Schema.Types.ObjectId, ref: "InvitationGuest", default: null },
    channel: { type: String, enum: ["whatsapp", "sms"], default: "whatsapp" },
    personalUrl: { type: String, required: true },
    simulated: { type: Boolean, default: true },
    externalSend: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default models.InvitationStudioTestMessage ||
  model("InvitationStudioTestMessage", InvitationStudioTestMessageSchema);
