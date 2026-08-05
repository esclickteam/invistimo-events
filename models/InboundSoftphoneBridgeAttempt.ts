import mongoose, { Schema, model, models } from "mongoose";

export type InboundBridgeStatus =
  | "claimed"
  | "dialing"
  | "ringing"
  | "answered"
  | "bridged"
  | "failed_busy"
  | "failed_rejected"
  | "failed_timeout"
  | "failed_canceled"
  | "failed_capacity"
  | "failed"
  | "completed"
  | "cleaned_stale";

export type InboundSoftphoneBridgeAttemptDoc = {
  bridgeAttemptId: string;
  /** Stable session key shared by PSTN + dial + WebRTC legs. */
  bridgeSessionId: string;
  /** Original PSTN inbound call_control_id (unique root). */
  rootInboundCallControlId: string;

  inboundCallControlId: string;
  inboundCallLegId?: string | null;
  inboundCallSessionId?: string | null;
  inboundConnectionId?: string | null;

  outboundCallControlId?: string | null;
  outboundCallLegId?: string | null;
  webrtcCallControlId?: string | null;
  webrtcCallLegId?: string | null;
  dialConnectionId?: string | null;

  userId?: string | null;
  credentialId?: string | null;
  sipDestination?: string | null;

  status: InboundBridgeStatus;
  attemptNumber: number;
  maxAttempts: number;

  busyCredentialIds: string[];

  lockOwner?: string | null;
  lockExpiresAt?: Date | null;

  /** Hangup arrived before peer callControlId was mapped. */
  pendingPeerHangup?: boolean;
  pendingHangupCause?: string | null;

  hangupCause?: string | null;
  sipCode?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;

  startedAt: Date;
  dialStartedAt?: Date | null;
  answeredAt?: Date | null;
  endedAt?: Date | null;
  lastEventAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
};

const ACTIVE_STATUSES: InboundBridgeStatus[] = [
  "claimed",
  "dialing",
  "ringing",
  "answered",
  "bridged",
];

const InboundSoftphoneBridgeAttemptSchema =
  new Schema<InboundSoftphoneBridgeAttemptDoc>(
    {
      bridgeAttemptId: {
        type: String,
        required: true,
        index: true,
      },

      bridgeSessionId: {
        type: String,
        required: true,
        index: true,
      },

      rootInboundCallControlId: {
        type: String,
        required: true,
        index: true,
      },

      inboundCallControlId: {
        type: String,
        required: true,
        index: true,
      },

      inboundCallLegId: { type: String, default: null, index: true },
      inboundCallSessionId: { type: String, default: null, index: true },
      inboundConnectionId: { type: String, default: null },

      outboundCallControlId: { type: String, default: null, index: true },
      outboundCallLegId: { type: String, default: null },
      webrtcCallControlId: { type: String, default: null, index: true },
      webrtcCallLegId: { type: String, default: null },
      dialConnectionId: { type: String, default: null },

      userId: { type: String, default: null, index: true },
      credentialId: { type: String, default: null, index: true },
      sipDestination: { type: String, default: null },

      status: {
        type: String,
        required: true,
        enum: [
          "claimed",
          "dialing",
          "ringing",
          "answered",
          "bridged",
          "failed_busy",
          "failed_rejected",
          "failed_timeout",
          "failed_canceled",
          "failed_capacity",
          "failed",
          "completed",
          "cleaned_stale",
        ],
        index: true,
      },

      attemptNumber: { type: Number, default: 1 },
      maxAttempts: { type: Number, default: 2 },

      busyCredentialIds: { type: [String], default: [] },

      lockOwner: { type: String, default: null },
      lockExpiresAt: { type: Date, default: null, index: true },

      pendingPeerHangup: { type: Boolean, default: false, index: true },
      pendingHangupCause: { type: String, default: null },

      hangupCause: { type: String, default: null },
      sipCode: { type: String, default: null },
      lastErrorCode: { type: String, default: null },
      lastErrorMessage: { type: String, default: null },

      startedAt: { type: Date, default: Date.now, index: true },
      dialStartedAt: { type: Date, default: null },
      answeredAt: { type: Date, default: null },
      endedAt: { type: Date, default: null, index: true },
      lastEventAt: { type: Date, default: Date.now, index: true },
    },
    { timestamps: true }
  );

InboundSoftphoneBridgeAttemptSchema.index({ status: 1, lastEventAt: 1 });
InboundSoftphoneBridgeAttemptSchema.index({
  status: 1,
  lockExpiresAt: 1,
});

export const INBOUND_BRIDGE_ACTIVE_STATUSES = ACTIVE_STATUSES;

const InboundSoftphoneBridgeAttempt =
  models.InboundSoftphoneBridgeAttempt ||
  model<InboundSoftphoneBridgeAttemptDoc>(
    "InboundSoftphoneBridgeAttempt",
    InboundSoftphoneBridgeAttemptSchema
  );

export default InboundSoftphoneBridgeAttempt;
