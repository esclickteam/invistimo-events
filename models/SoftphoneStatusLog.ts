import mongoose, { Schema, model, models } from "mongoose";

const SoftphoneStatusLogSchema = new Schema(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    fromStatus: {
      type: String,
      enum: [
        "available",
        "dialing",
        "ringing",
        "in_call",
        "after_call",
        "break",
        "unavailable",
        "offline",
      ],
      default: null,
      index: true,
    },

    toStatus: {
      type: String,
      enum: [
        "available",
        "dialing",
        "ringing",
        "in_call",
        "after_call",
        "break",
        "unavailable",
        "offline",
      ],
      required: true,
      index: true,
    },

    startedAt: {
      type: Date,
      required: true,
      index: true,
    },

    endedAt: {
      type: Date,
      required: true,
      index: true,
    },

    durationSeconds: {
      type: Number,
      default: 0,
    },

    dayKey: {
      type: String,
      required: true,
      index: true,
    },

    callId: {
      type: Schema.Types.ObjectId,
      ref: "CallLog",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

SoftphoneStatusLogSchema.index({ agentId: 1, dayKey: 1 });
SoftphoneStatusLogSchema.index({ dayKey: 1, toStatus: 1 });

const SoftphoneStatusLog =
  models.SoftphoneStatusLog ||
  model("SoftphoneStatusLog", SoftphoneStatusLogSchema);

export default SoftphoneStatusLog;