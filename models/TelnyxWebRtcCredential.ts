import mongoose, { Schema, model, models } from "mongoose";

export type TelnyxWebRtcCredentialStatus = "active" | "revoked";

export type TelnyxWebRtcCredentialDoc = {
  userId: mongoose.Types.ObjectId;
  telnyxCredentialId: string;
  status: TelnyxWebRtcCredentialStatus;
  createdAt: Date;
  updatedAt: Date;
  revokedAt?: Date | null;
  revokeReason?: string | null;
};

const TelnyxWebRtcCredentialSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    telnyxCredentialId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
      index: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    revokeReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

TelnyxWebRtcCredentialSchema.index(
  { userId: 1, status: 1 },
  { name: "telnyx_webrtc_user_status_idx" }
);

const TelnyxWebRtcCredential =
  models.TelnyxWebRtcCredential ||
  model<TelnyxWebRtcCredentialDoc>(
    "TelnyxWebRtcCredential",
    TelnyxWebRtcCredentialSchema
  );

export default TelnyxWebRtcCredential;
