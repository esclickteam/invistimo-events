import mongoose, { Schema, Types, type Model } from "mongoose";

/**
 * One IVR call attempt (outbound dial or inbound callback) for a guest/record.
 * Always linked to guestId before dialing/claiming. RSVP updates use InvitationGuest.rsvp / arrivedCount.
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
  | "canceled"
  | "unresolved";

export type IvrCallFlowStep =
  | "dialing"
  | "answer_delay"
  | "playing_intro"
  | "playing_intro_before"
  | "playing_event_name"
  | "playing_intro_after"
  | "gather_choice"
  | "playing_ask_count"
  | "gather_count"
  | "playing_thanks"
  | "playing_invalid"
  | "playing_system"
  | "done";

export type IvrCallChannel = "outbound_ivr" | "inbound_ivr";
export type IvrCallDirection = "outbound" | "inbound";

export type IvrRsvpResult = "yes" | "no" | "maybe" | null;

export interface IIvrCallAttempt {
  _id?: Types.ObjectId;

  userId: Types.ObjectId;
  invitationId: Types.ObjectId;
  guestId: Types.ObjectId;

  /** Outbound round 1–3; inbound callbacks omit round. */
  round?: 1 | 2 | 3;
  phone: string;

  /** History channel — inbound callbacks are stored as inbound_ivr. */
  channel: IvrCallChannel;
  direction: IvrCallDirection;
  /** Snapshot of spoken/display event name for inbound greeting + history. */
  eventName?: string;

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

  /** @deprecated self-recorded / legacy single-file intro */
  introAudioUrl?: string;
  /** Global pack gender used for this attempt's DTMF follow-ups. */
  voiceGender?: "female" | "male" | null;
  /** Per-event spoken name clip URL (AI mode sequential intro). */
  eventNameAudioUrl?: string;
  error?: string;
  hangupCause?: string;
  hangupSource?: string;

  /** Soft lock for dialer concurrency. */
  dialLockedAt?: Date | null;
  /** Retries reuse this row. A new document is not created for the same guest/round. */
  retryCount?: number;

  /** ai | self_recorded. Empty on older rows. */
  audioMode?: string;

  dialRequestedAt?: Date | null;
  ringingAt?: Date | null;
  /** Server asked Telnyx to play. Not proof that audio started. */
  playbackCommandAt?: Date | null;
  /** Telnyx playback.started / speak.started. */
  playbackStartedAt?: Date | null;
  firstDigitAt?: Date | null;
  choiceDigitAt?: Date | null;
  /** First provider playback start after a digit was stored. */
  followupPlaybackStartedAt?: Date | null;

  timeline?: Array<{
    at: Date;
    source: "telnyx" | "server";
    kind: string;
    label: string;
    detail?: string;
    eventType?: string;
    digit?: string;
    stage?: string;
  }>;

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
      required: false,
      default: undefined,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["outbound_ivr", "inbound_ivr"],
      default: "outbound_ivr",
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ["outbound", "inbound"],
      default: "outbound",
      required: true,
      index: true,
    },
    eventName: {
      type: String,
      trim: true,
      default: "",
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
        "unresolved",
      ],
      default: "queued",
      required: true,
      index: true,
    },
    flowStep: {
      type: String,
      enum: [
        "dialing",
        "answer_delay",
        "playing_intro",
        "playing_intro_before",
        "playing_event_name",
        "playing_intro_after",
        "gather_choice",
        "playing_ask_count",
        "gather_count",
        "playing_thanks",
        "playing_invalid",
        "playing_system",
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
    voiceGender: {
      type: String,
      enum: ["female", "male", null],
      default: null,
    },
    eventNameAudioUrl: {
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
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    audioMode: {
      type: String,
      trim: true,
      default: "",
    },
    dialRequestedAt: { type: Date, default: null },
    ringingAt: { type: Date, default: null },
    playbackCommandAt: { type: Date, default: null },
    playbackStartedAt: { type: Date, default: null },
    firstDigitAt: { type: Date, default: null },
    choiceDigitAt: { type: Date, default: null },
    followupPlaybackStartedAt: { type: Date, default: null },
    timeline: {
      type: [
        {
          at: { type: Date, required: true },
          source: { type: String, enum: ["telnyx", "server"], required: true },
          kind: { type: String, default: "" },
          label: { type: String, default: "" },
          detail: { type: String, default: "" },
          eventType: { type: String, default: "" },
          digit: { type: String, default: "" },
          stage: { type: String, default: "" },
        },
      ],
      default: [],
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

IvrCallAttemptSchema.index({
  channel: 1,
  phone: 1,
  startedAt: -1,
});

IvrCallAttemptSchema.index({
  direction: 1,
  createdAt: -1,
});

IvrCallAttemptSchema.index({ createdAt: -1 });

IvrCallAttemptSchema.index({
  invitationId: 1,
  createdAt: -1,
});

IvrCallAttemptSchema.index({
  userId: 1,
  createdAt: -1,
});

const IvrCallAttemptModel =
  (mongoose.models.IvrCallAttempt as Model<IIvrCallAttempt> | undefined) ||
  mongoose.model<IIvrCallAttempt>("IvrCallAttempt", IvrCallAttemptSchema);

export default IvrCallAttemptModel;
