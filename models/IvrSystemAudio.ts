import mongoose, { Schema, type Model } from "mongoose";
import type { IvrSystemPromptKey } from "@/lib/calls/ivrScript";

/**
 * Shared system prompt audio used after DTMF (all IVR events).
 * Generated once via ElevenLabs and reused — never per-call TTS.
 */

export interface IIvrSystemAudio {
  _id?: mongoose.Types.ObjectId;
  key: IvrSystemPromptKey;
  text: string;
  voiceId: string;
  audioUrl: string;
  publicToken?: string;
  r2Key?: string;
  contentType: string;
  durationSeconds?: number | null;
  contentHash: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const IvrSystemAudioSchema = new Schema<IIvrSystemAudio>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    voiceId: {
      type: String,
      required: true,
      trim: true,
    },
    audioUrl: {
      type: String,
      required: true,
      trim: true,
    },
    publicToken: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    r2Key: {
      type: String,
      trim: true,
      default: "",
    },
    contentType: {
      type: String,
      default: "audio/mpeg",
      trim: true,
    },
    durationSeconds: {
      type: Number,
      default: null,
    },
    contentHash: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const IvrSystemAudioModel =
  (mongoose.models.IvrSystemAudio as Model<IIvrSystemAudio> | undefined) ||
  mongoose.model<IIvrSystemAudio>("IvrSystemAudio", IvrSystemAudioSchema);

export default IvrSystemAudioModel;
