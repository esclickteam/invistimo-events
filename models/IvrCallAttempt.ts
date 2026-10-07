import mongoose, { Schema, Types, type Model } from "mongoose";

/**
 * One outbound IVR dial attempt for a specific guest/record.
 * Always linked to guestId before dialing. RSVP updates use InvitationGuest.rsvp / arrivedCount.
 */

export type IvrCallAttemptStatus =
  | "queued"
  | "initiated"
  | "ringing"
  | "answered"
  | "no_answer"
  | "busy"
  | "failed"
  | "voicemail"
  | "hangup_before_response"
  | "invalid_input"
  | "completed"
  | "canceled";

export type IvrCallFlowStep =
  | "dialing"
  | "playing_intro"
  | "gather_choice"
  | "playing_ask_count"
  | "gather_count"
  | "playing_thanks"
  | "playing_invalid"
  | "done";

export type IvrRsvpResult = "yes" | "no" | "maybe" | null;

export interface IIvrCallAttempt {
  _id?: Types.ObjectId;

  userId: Types.ObjectId;
  invitationId: Types.ObjectId;
  guestId: Types.ObjectId;

  round: 1 | 2 | 3;
  phone: string;

  status: IvrCallAttemptStatus;
  flowStep: IvrCallFlowStep;

  telnyxCallControlId?: string;
  telnyxCallLegId?: string;
  telnyxCallSessionId?: string;
  telnyxConnectionId?: string;

  answered: boolean;
  dtmfDigits: string[];
  choiceDigit?: string;
  guestCountDigits?: string;

  rsvpResult?: IvrRsvpResult;
  attendingCount?: number | null;
  rsvpApplied: boolean;
  rsvpAppliedAt?: Date | null;

  /** Prevents duplicate RSVP writes from replayed webhooks. */
  processedWebhookEventIds: string[];

  startedAt?: Date | null;
  answeredAt?: Date | null;
  endedAt?: Date | null;
  durationSeconds: number;

  introAudioUrl?: string;
  error?: string;
  hangupCause?: string;
  hangupSource?: string;

  /** Soft lock for dialer concurrency. */
  dialLockedAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

const IvrCallAttemptSchema = new Schema<IIvrCallAttempt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
      index: true,
    },
    guestId: {
      type: Schema.Types.ObjectId,
      ref: "InvitationGuest",
      required: true,
      index: true,
    },
    round: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "queued",
        "initiated",
        "ringing",
        "answered",
        "no_answer",
        "busy",
        "failed",
        "voicemail",
        "hangup_before_response",
        "invalid_input",
        "completed",
        "canceled",
      ],
      default: "queued",
      required: true,
      index: true,
    },
    flowStep: {
      type: String,
      enum: [
        "dialing",
        "playing_intro",
        "gather_choice",
        "playing_ask_count",
        "gather_count",
        "playing_thanks",
        "playing_invalid",
        "done",
      ],
      default: "dialing",
      index: true,
    },
    telnyxCallControlId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    telnyxCallLegId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    telnyxCallSessionId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    telnyxConnectionId: {
      type: String,
      trim: true,
      default: "",
    },
    answered: {
      type: Boolean,
      default: false,
      index: true,
    },
    dtmfDigits: {
      type: [String],
      default: [],
    },
    choiceDigit: {
      type: String,
      trim: true,
      default: "",
    },
    guestCountDigits: {
      type: String,
      trim: true,
      default: "",
    },
    rsvpResult: {
      type: String,
      enum: ["yes", "no", "maybe", null],
      default: null,
      index: true,
    },
    attendingCount: {
      type: Number,
      default: null,
      min: 0,
    },
    rsvpApplied: {
      type: Boolean,
      default: false,
      index: true,
    },
    rsvpAppliedAt: {
      type: Date,
      default: null,
    },
    processedWebhookEventIds: {
      type: [String],
      default: [],
    },
    startedAt: {
      type: Date,
      default: null,
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
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    introAudioUrl: {
      type: String,
      trim: true,
      default: "",
    },
    error: {
      type: String,
      trim: true,
      default: "",
    },
    hangupCause: {
      type: String,
      trim: true,
      default: "",
    },
    hangupSource: {
      type: String,
      trim: true,
      default: "",
    },
    dialLockedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * At most one attempt per guest per round per user schedule execution window
 * is enforced at dial time; unique on control id when present.
 */
IvrCallAttemptSchema.index(
  { telnyxCallControlId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      telnyxCallControlId: { $type: "string", $gt: "" },
    },
    name: "unique_ivr_telnyx_call_control_id",
  }
);

IvrCallAttemptSchema.index({
  invitationId: 1,
  round: 1,
  status: 1,
});

IvrCallAttemptSchema.index({
  guestId: 1,
  round: 1,
  createdAt: -1,
});

IvrCallAttemptSchema.index({
  userId: 1,
  round: 1,
  startedAt: -1,
});

IvrCallAttemptSchema.index({
  status: 1,
  startedAt: 1,
});

const IvrCallAttemptModel =
  (mongoose.models.IvrCallAttempt as Model<IIvrCallAttempt> | undefined) ||
  mongoose.model<IIvrCallAttempt>("IvrCallAttempt", IvrCallAttemptSchema);

export default IvrCallAttemptModel;
