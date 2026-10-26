import mongoose, { Schema, models, model } from "mongoose";
import { DEFAULT_DESIGNED_INVITATION_PRICE_ILS } from "@/lib/invitationStudio/entitlement";

const PlateOverrideSchema = new Schema(
  {
    key: { type: String, required: true },
    hidden: { type: Boolean, default: false },
    free: { type: Boolean, default: null },
    sort: { type: Number, default: null },
    name: { type: String, default: "" },
    description: { type: String, default: "" },
    defaultMusic: { type: Boolean, default: null },
  },
  { _id: false }
);

const MusicLibrarySchema = new Schema(
  {
    cueId: { type: String, default: "evening-motif" },
    label: { type: String, default: "מוטיב ערב" },
    /** Optional replacement track as data URL; empty uses the bundled WAV. */
    dataUrl: { type: String, default: "" },
    fileName: { type: String, default: "" },
    rightsConfirmed: { type: Boolean, default: false },
  },
  { _id: false }
);

const InvitationStudioSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "designedInvitation" },
    priceIls: { type: Number, default: DEFAULT_DESIGNED_INVITATION_PRICE_ILS },
    plates: { type: [PlateOverrideSchema], default: [] },
    music: { type: MusicLibrarySchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default models.InvitationStudioSettings ||
  model("InvitationStudioSettings", InvitationStudioSettingsSchema);
