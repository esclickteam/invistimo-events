import mongoose, { Schema } from "mongoose";

/**
 * One document serializes outbound IVR admission across workers.
 * The lock expires so a crashed worker cannot hold the 500-call gate shut.
 */
const IvrCapacityLockSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    lockUntil: { type: Date, default: null },
    lockToken: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.IvrCapacityLock ||
  mongoose.model("IvrCapacityLock", IvrCapacityLockSchema);
