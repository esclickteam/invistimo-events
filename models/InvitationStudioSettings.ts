import mongoose, { Schema, models, model } from "mongoose";
import { DEFAULT_DESIGNED_INVITATION_PRICE_ILS } from "@/lib/invitationStudio/entitlement";

const InvitationStudioSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "designedInvitation" },
    priceIls: { type: Number, default: DEFAULT_DESIGNED_INVITATION_PRICE_ILS },
  },
  { timestamps: true }
);

export default models.InvitationStudioSettings ||
  model("InvitationStudioSettings", InvitationStudioSettingsSchema);
