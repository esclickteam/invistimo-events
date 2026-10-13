import mongoose, { Schema } from "mongoose";

const EventDeletionControlSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "event-auto-deletion",
      index: true,
    },
    /** Real deletion cannot be enabled from this document. The engine ignores live mode. */
    mode: {
      type: String,
      enum: ["dry_run"],
      default: "dry_run",
    },
    emergencyStop: {
      type: Boolean,
      default: false,
    },
    anomalyThreshold: {
      type: Number,
      default: 25,
    },
    maxPerRun: {
      type: Number,
      default: 10,
    },
  },
  { timestamps: true }
);

export default mongoose.models.EventDeletionControl ||
  mongoose.model("EventDeletionControl", EventDeletionControlSchema);
