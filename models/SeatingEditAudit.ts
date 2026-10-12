import mongoose, { Schema, models, model } from "mongoose";

const SeatingEditAuditSchema = new Schema(
  {
    eventId: { type: String, required: true, index: true },
    userId: { type: String, default: "", index: true },
    screenInstanceId: { type: String, default: "", index: true },
    action: { type: String, required: true, index: true },
    editOpenedAt: { type: Date, default: null },
    lastActivityAt: { type: Date, default: null },
    lockId: { type: String, default: "" },
    generation: { type: Number, default: null },
    mapVersion: { type: Number, default: null },
    rejectReason: { type: String, default: "" },
    changes: { type: [Schema.Types.Mixed], default: [] },
    changesTruncated: { type: Boolean, default: false },
    changeCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SeatingEditAuditSchema.index({ eventId: 1, createdAt: -1 });

export default models.SeatingEditAudit ||
  model("SeatingEditAudit", SeatingEditAuditSchema);
