import mongoose, { Schema, type Model } from "mongoose";
import { guardPurgedCustomerWrites } from "@/lib/customers/purgedCustomerGuard";

/**
 * Append-only audit of one outbound human dial.
 * Webhooks may fill empty timestamps. They must not erase a stored attempt.
 */
const CallAttemptSchema = new Schema(
  {
    callControlId: { type: String, required: true, unique: true, index: true },
    eventIds: { type: [String], default: [] },
    invitationId: { type: Schema.Types.ObjectId, index: true },
    guestId: { type: Schema.Types.ObjectId, index: true },
    workOrderId: { type: Schema.Types.ObjectId, index: true },
    taskId: { type: Schema.Types.ObjectId, index: true },
    round: { type: Number, index: true },
    guestName: { type: String, default: "" },
    guestPhone: { type: String, default: "" },
    employeeId: { type: String, default: "", index: true },
    employeeName: { type: String, default: "" },
    startedAt: { type: Date, default: null },
    answeredAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    durationMs: { type: Number, default: null },
    ringMs: { type: Number, default: null },
    talkMs: { type: Number, default: null },
    preciseDuration: { type: Boolean, default: false },
    telnyxAnswered: { type: Boolean, default: false },
    answerType: { type: String, default: "" },
    telnyxResult: { type: String, default: "" },
    agentResult: { type: String, default: "" },
    sipCode: { type: String, default: "" },
    hangupCause: { type: String, default: "" },
    hangupSource: { type: String, default: "" },
    hangupInitiator: { type: String, default: "" },
    agentHangupRequestedAt: { type: Date, default: null },
    outcome: { type: String, default: "awaiting_provider" },
    meetsMinimum: { type: Boolean, default: false },
    closedTask: { type: Boolean, default: false },
    note: { type: String, default: "" },
    rawEvents: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

CallAttemptSchema.index({ taskId: 1, startedAt: 1 });
CallAttemptSchema.index({ invitationId: 1, round: 1 });

guardPurgedCustomerWrites(CallAttemptSchema);

const CallAttemptModel =
  (mongoose.models.CallAttempt as Model<any> | undefined) ||
  mongoose.model("CallAttempt", CallAttemptSchema);

export default CallAttemptModel;
