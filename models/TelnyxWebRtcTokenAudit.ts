import mongoose, { Schema, model, models } from "mongoose";

export type TelnyxWebRtcTokenAuditDoc = {
  userId?: mongoose.Types.ObjectId | null;
  role?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  success: boolean;
  failureReason?: string | null;
  timestamp: Date;
};

const TelnyxWebRtcTokenAuditSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    role: {
      type: String,
      default: null,
    },

    ip: {
      type: String,
      default: null,
      index: true,
    },

    userAgent: {
      type: String,
      default: null,
    },

    success: {
      type: Boolean,
      required: true,
      index: true,
    },

    failureReason: {
      type: String,
      default: null,
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

const TelnyxWebRtcTokenAudit =
  models.TelnyxWebRtcTokenAudit ||
  model<TelnyxWebRtcTokenAuditDoc>(
    "TelnyxWebRtcTokenAudit",
    TelnyxWebRtcTokenAuditSchema
  );

export default TelnyxWebRtcTokenAudit;
