import mongoose, { Schema, model, models } from "mongoose";

export type CallDirection = "inbound" | "outbound" | "unknown";

export type CallStatus =
  | "initiated"
  | "ringing"
  | "answered"
  | "completed"
  | "missed"
  | "no_answer"
  | "busy"
  | "failed"
  | "voicemail"
  | "canceled"
  | "unknown";

export type CallRecordingStatus =
  | "pending"
  | "started"
  | "saved"
  | "failed"
  | "deleted";

export type CallRecordingStorage = "" | "r2" | "telnyx" | "external";

export type CallRecordingSource =
  | "webhook"
  | "manual"
  | "system"
  | "softphone";

export type CallRecordingDocument = {
  _id: mongoose.Types.ObjectId;

  // Telnyx identifiers
  eventId?: string;
  callControlId?: string;
  callLegId?: string;
  callSessionId?: string;
  connectionId?: string;

  // Call status
  callStatus: CallStatus;
  telnyxCallStatus?: string;
  hangupCause?: string;
  hangupSource?: string;
  lastWebhookEvent?: string;

  // Recording identifiers
  recordingId?: string;
  recordingStatus: CallRecordingStatus;

  // Legacy / Telnyx temporary urls
  recordingUrl?: string;
  recordingUrls?: {
    mp3?: string;
    wav?: string;
    raw?: string;
  };

  // Permanent storage - Cloudflare R2
  recordingStorage?: CallRecordingStorage;
  recordingBucket?: string;
  recordingKey?: string;
  recordingContentType?: string;
  recordingSizeBytes?: number;
  recordingSavedAt?: Date | null;
  recordingPermanentUrl?: string;

  // Storage status/debug
  recordingStorageStatus?: string;
  recordingStorageError?: string;

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
  startedAt?: Date | null;
  answeredAt?: Date | null;
  endedAt?: Date | null;
  recordedAt?: Date | null;
  durationSeconds?: number;

  // Source
  provider: "telnyx";
  source: CallRecordingSource;

  // Data we pass to Telnyx client_state
  clientState?: Record<string, unknown>;

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

    callStatus: {
      type: String,
      enum: [
        "initiated",
        "ringing",
        "answered",
        "completed",
        "missed",
        "no_answer",
        "busy",
        "failed",
        "voicemail",
        "canceled",
        "unknown",
      ],
      default: "unknown",
      index: true,
    },

    telnyxCallStatus: {
      type: String,
      default: "",
      trim: true,
    },

    hangupCause: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    hangupSource: {
      type: String,
      default: "",
      trim: true,
    },

    lastWebhookEvent: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    /*
      חשוב:
      recordingId כבר לא required ולא unique ישירות בשדה.
      למה?
      כי אנחנו יוצרים רשומת שיחה כבר בתחילת החיוג,
      ובשלב הזה עדיין אין recordingId.
    */
    recordingId: {
      type: String,
      default: "",
      trim: true,
    },

    recordingStatus: {
      type: String,
      enum: ["pending", "started", "saved", "failed", "deleted"],
      default: "pending",
      index: true,
    },

    /*
      recordingUrl / recordingUrls הם לינקים זמניים של Telnyx.
      משאירים אותם רק לדיבוג/גיבוי, לא לניגון קבוע.
    */
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

    /*
      Cloudflare R2 permanent storage
    */
    recordingStorage: {
      type: String,
      enum: ["", "r2", "telnyx", "external"],
      default: "",
      index: true,
      trim: true,
    },

    recordingBucket: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    recordingKey: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    recordingContentType: {
      type: String,
      default: "",
      trim: true,
    },

    recordingSizeBytes: {
      type: Number,
      default: 0,
      min: 0,
    },

    recordingSavedAt: {
      type: Date,
      default: null,
      index: true,
    },

    recordingPermanentUrl: {
      type: String,
      default: "",
      trim: true,
    },

    recordingStorageStatus: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    recordingStorageError: {
      type: String,
      default: "",
      trim: true,
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
      index: true,
      trim: true,
    },

    agentEmail: {
      type: String,
      default: "",
      index: true,
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

    answeredAt: {
      type: Date,
      default: null,
      index: true,
    },

    endedAt: {
      type: Date,
      default: null,
      index: true,
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
      index: true,
    },

    provider: {
      type: String,
      enum: ["telnyx"],
      default: "telnyx",
      index: true,
    },

    source: {
      type: String,
      enum: ["webhook", "manual", "system", "softphone"],
      default: "webhook",
      index: true,
    },

    clientState: {
      type: Schema.Types.Mixed,
      default: {},
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

/* ============================================================
   Indexes
============================================================ */

CallRecordingSchema.index({ createdAt: -1 });
CallRecordingSchema.index({ recordedAt: -1 });
CallRecordingSchema.index({ startedAt: -1 });
CallRecordingSchema.index({ answeredAt: -1 });
CallRecordingSchema.index({ endedAt: -1 });

CallRecordingSchema.index({ direction: 1, createdAt: -1 });
CallRecordingSchema.index({ callStatus: 1, createdAt: -1 });
CallRecordingSchema.index({ recordingStatus: 1, createdAt: -1 });

CallRecordingSchema.index({ agentId: 1, createdAt: -1 });
CallRecordingSchema.index({ agentEmail: 1, createdAt: -1 });

CallRecordingSchema.index({ customerPhone: 1, createdAt: -1 });
CallRecordingSchema.index({ to: 1, createdAt: -1 });
CallRecordingSchema.index({ from: 1, createdAt: -1 });

CallRecordingSchema.index({ callControlId: 1, createdAt: -1 });
CallRecordingSchema.index({ callLegId: 1, createdAt: -1 });
CallRecordingSchema.index({ callSessionId: 1, createdAt: -1 });
CallRecordingSchema.index({ connectionId: 1, createdAt: -1 });

/*
  חשוב:
  recordingId חייב להיות ייחודי רק אם הוא קיים ולא ריק.
  זה מאפשר ליצור רשומות חיוג לפני שנוצרה הקלטה.
*/
CallRecordingSchema.index(
  { recordingId: 1 },
  {
    unique: true,
    name: "recordingId_unique_when_present",
    partialFilterExpression: {
      recordingId: { $gt: "" },
    },
  }
);

/*
  R2 indexes
*/
CallRecordingSchema.index({ recordingStorage: 1, createdAt: -1 });
CallRecordingSchema.index({ recordingBucket: 1, recordingKey: 1 });
CallRecordingSchema.index({ recordingStorageStatus: 1, createdAt: -1 });
CallRecordingSchema.index({ recordingSavedAt: -1 });

const CallRecording =
  models.CallRecording ||
  model<CallRecordingDocument>("CallRecording", CallRecordingSchema);

export default CallRecording;