import mongoose, { Schema, type Model } from "mongoose";

/**
 * Singleton document: the two Invistimo system voices (Dana female + chosen Hebrew male).
 * Resolved once from ElevenLabs (or env overrides) and reused everywhere.
 */

export type IIvrResolvedVoice = {
  voiceId: string;
  name: string;
  label: string;
  gender: "female" | "male";
  language?: string;
  source: "env" | "auto" | "manual";
};

export interface IIvrSystemVoiceConfig {
  _id?: mongoose.Types.ObjectId;
  key: string;
  female?: IIvrResolvedVoice | null;
  male?: IIvrResolvedVoice | null;
  resolvedAt?: Date | null;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ResolvedVoiceSchema = new Schema<IIvrResolvedVoice>(
  {
    voiceId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, default: "" },
    label: { type: String, required: true, trim: true, default: "" },
    gender: { type: String, enum: ["female", "male"], required: true },
    language: { type: String, trim: true, default: "he" },
    source: {
      type: String,
      enum: ["env", "auto", "manual"],
      default: "auto",
    },
  },
  { _id: false }
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
    female: { type: ResolvedVoiceSchema, default: null },
    male: { type: ResolvedVoiceSchema, default: null },
    resolvedAt: { type: Date, default: null },
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
