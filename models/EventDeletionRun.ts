import mongoose, { Schema } from "mongoose";

const EntrySchema = new Schema(
  {
    userId: { type: String, default: "" },
    customerName: { type: String, default: "" },
    eventId: { type: String, default: "" },
    eventTitle: { type: String, default: "" },
    eventDate: { type: String, default: "" },
    plannedDeletionAt: { type: String, default: "" },
    bucket: { type: String, default: "" },
    reasons: { type: [String], default: [] },
    reminderRoundComplete: { type: Boolean, default: false },
    thankYouClear: { type: Boolean, default: false },
    openWorkCount: { type: Number, default: 0 },
    outcome: { type: String, default: "reported" },
  },
  { _id: false }
);

const EventDeletionRunSchema = new Schema(
  {
    mode: {
      type: String,
      enum: ["dry_run"],
      default: "dry_run",
      index: true,
    },
    startedAt: { type: Date, default: () => new Date() },
    finishedAt: { type: Date, default: null },
    emergencyStop: { type: Boolean, default: false },
    anomaly: { type: Boolean, default: false },
    eligibleAccounts: { type: Number, default: 0 },
    executed: { type: Number, default: 0 },
    entries: { type: [EntrySchema], default: [] },
  },
  { timestamps: true }
);

EventDeletionRunSchema.index({ createdAt: -1 });

export default mongoose.models.EventDeletionRun ||
  mongoose.model("EventDeletionRun", EventDeletionRunSchema);
