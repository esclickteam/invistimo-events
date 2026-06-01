import mongoose, { Schema, model, models } from "mongoose";

export type CallDirection = "inbound" | "outbound" | "unknown";

export type CallRecordingStatus =
  | "started"
  | "saved"
  | "failed"
  | "deleted";

export type CallRecordingDocument = {
  _id: mongoose.Types.ObjectId;

  // Telnyx identifiers
  eventId?: string;
  callControlId?: string;
  callLegId?: string;
  callSessionId?: string;
  connectionId?: string;

  // Recording identifiers
  recordingId: string;
  recordingStatus: CallRecordingStatus;

  // Recording files
  recordingUrl?: string;
  recordingUrls?: {
    mp3?: string;
    wav?: string;
    raw?: string;
  };

  // Call details
  from?: string;
  to?: string;
  direction: CallDirection;

  // Agent / staff
  agentId?: string;
  agentName?: string;
  agentEmail?: string;

  // Customer / related entity
  customerId?: string;
  customerName?: string;
  customerPhone?: string;

  // Timing
  startedAt?: Date;
  endedAt?: Date;
  recordedAt?: Date;
  durationSeconds?: number;

  // Source
  provider: "telnyx";
  source: "webhook" | "manual" | "system";

  // Raw payload for debugging
  rawPayload?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
};

const CallRecordingSchema = new Schema<CallRecordingDocument>(
  {
    eventId: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    callControlId: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    callLegId: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    callSessionId: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    connectionId: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    recordingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    recordingStatus: {
      type: String,
      enum: ["started", "saved", "failed", "deleted"],
      default: "saved",
      index: true,
    },

    recordingUrl: {
      type: String,
      default: "",
      trim: true,
    },

    recordingUrls: {
      mp3: {
        type: String,
        default: "",
        trim: true,
      },
      wav: {
        type: String,
        default: "",
        trim: true,
      },
      raw: {
        type: String,
        default: "",
        trim: true,
      },
    },

    from: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    to: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    direction: {
      type: String,
      enum: ["inbound", "outbound", "unknown"],
      default: "unknown",
      index: true,
    },

    agentId: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    agentName: {
      type: String,
      default: "",
      trim: true,
    },

    agentEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    customerId: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    customerName: {
      type: String,
      default: "",
      trim: true,
    },

    customerPhone: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    startedAt: {
      type: Date,
      default: null,
      index: true,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    recordedAt: {
      type: Date,
      default: null,
      index: true,
    },

    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    provider: {
      type: String,
      enum: ["telnyx"],
      default: "telnyx",
      index: true,
    },

    source: {
      type: String,
      enum: ["webhook", "manual", "system"],
      default: "webhook",
      index: true,
    },

    rawPayload: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

CallRecordingSchema.index({ createdAt: -1 });
CallRecordingSchema.index({ recordedAt: -1 });
CallRecordingSchema.index({ direction: 1, createdAt: -1 });
CallRecordingSchema.index({ agentId: 1, createdAt: -1 });
CallRecordingSchema.index({ customerPhone: 1, createdAt: -1 });
CallRecordingSchema.index({ callSessionId: 1, createdAt: -1 });

const CallRecording =
  models.CallRecording ||
  model<CallRecordingDocument>("CallRecording", CallRecordingSchema);

export default CallRecording;