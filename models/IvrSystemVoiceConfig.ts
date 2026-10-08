import mongoose, { Schema, type Model } from "mongoose";

/**
 * Singleton: Invistimo global IVR voice pack config (female + male).
 * Voice IDs + approval live here; audio clips live in IvrSystemAudio / R2.
 */

export type IIvrPackVoiceMeta = {
  voiceId: string;
  /** Internal note for admin only — never shown to clients. */
  adminNote?: string;
  /** "auto" is legacy (pre Voice-Pack admin screen). */
  source: "env" | "manual" | "auto";
  segmentsReady: boolean;
  approved: boolean;
  approvedAt?: Date | null;
  lastGeneratedAt?: Date | null;
};

export interface IIvrSystemVoiceConfig {
  _id?: mongoose.Types.ObjectId;
  key: string;
  female?: IIvrPackVoiceMeta | null;
  male?: IIvrPackVoiceMeta | null;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PackVoiceMetaSchema = new Schema<IIvrPackVoiceMeta>(
  {
    voiceId: { type: String, required: false, trim: true, default: "" },
    adminNote: { type: String, trim: true, default: "" },
    source: {
      type: String,
      // "auto" kept for legacy Mongo docs from the old Dana-resolve schema.
      enum: ["env", "manual", "auto"],
      default: "manual",
    },
    segmentsReady: { type: Boolean, default: false },
    approved: { type: Boolean, default: false },
    approvedAt: { type: Date, default: null },
    lastGeneratedAt: { type: Date, default: null },
  },
  { _id: false, strict: false }
);

const IvrSystemVoiceConfigSchema = new Schema<IIvrSystemVoiceConfig>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
      index: true,
    },
    female: { type: PackVoiceMetaSchema, default: null },
    male: { type: PackVoiceMetaSchema, default: null },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

const IvrSystemVoiceConfigModel =
  (mongoose.models.IvrSystemVoiceConfig as
    | Model<IIvrSystemVoiceConfig>
    | undefined) ||
  mongoose.model<IIvrSystemVoiceConfig>(
    "IvrSystemVoiceConfig",
    IvrSystemVoiceConfigSchema
  );

export default IvrSystemVoiceConfigModel;
