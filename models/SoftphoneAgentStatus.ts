import mongoose, { Schema, model, models } from "mongoose";

export type SoftphoneAgentStatusType =
  | "available"
  | "dialing"
  | "ringing"
  | "in_call"
  | "after_call"
  | "break"
  | "unavailable"
  | "offline";

const SoftphoneAgentStatusSchema = new Schema(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    status: {
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
      default: "offline",
      index: true,
    },

    statusStartedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    currentCallId: {
      type: Schema.Types.ObjectId,
      ref: "CallLog",
      default: null,
      index: true,
    },

    dayKey: {
      type: String,
      required: true,
      index: true,
    },

    todayAvailableSeconds: {
      type: Number,
      default: 0,
    },

    todayDialingSeconds: {
      type: Number,
      default: 0,
    },

    todayRingingSeconds: {
      type: Number,
      default: 0,
    },

    todayTalkSeconds: {
      type: Number,
      default: 0,
    },

    todayAfterCallSeconds: {
      type: Number,
      default: 0,
    },

    todayBreakSeconds: {
      type: Number,
      default: 0,
    },

    todayUnavailableSeconds: {
      type: Number,
      default: 0,
    },

    todayOfflineSeconds: {
      type: Number,
      default: 0,
    },

    totalCallsToday: {
      type: Number,
      default: 0,
    },

    answeredCallsToday: {
      type: Number,
      default: 0,
    },

    missedCallsToday: {
      type: Number,
      default: 0,
    },

    failedCallsToday: {
      type: Number,
      default: 0,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

SoftphoneAgentStatusSchema.index({ dayKey: 1, status: 1 });
SoftphoneAgentStatusSchema.index({ agentId: 1, dayKey: 1 });

const SoftphoneAgentStatus =
  models.SoftphoneAgentStatus ||
  model("SoftphoneAgentStatus", SoftphoneAgentStatusSchema);

export default SoftphoneAgentStatus;