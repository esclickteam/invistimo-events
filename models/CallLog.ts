import mongoose, { Schema, model, models } from "mongoose";

const CallLogSchema = new Schema(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      default: null,
      index: true,
    },

    guestId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "created",
        "dialing",
        "ringing",
        "answered",
        "missed",
        "busy",
        "failed",
        "completed",
      ],
      default: "created",
      index: true,
    },

    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    answeredAt: {
      type: Date,
      default: null,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    ringDurationSeconds: {
      type: Number,
      default: 0,
    },

    talkDurationSeconds: {
      type: Number,
      default: 0,
    },

    providerCallId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    recordingUrl: {
      type: String,
      trim: true,
      default: "",
    },

    recordingStatus: {
      type: String,
      enum: ["none", "recording", "paused", "completed"],
      default: "none",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    dayKey: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CallLogSchema.index({ agentId: 1, dayKey: 1 });
CallLogSchema.index({ userId: 1, invitationId: 1 });
CallLogSchema.index({ phone: 1, createdAt: -1 });

const CallLog = models.CallLog || model("CallLog", CallLogSchema);

export default CallLog;