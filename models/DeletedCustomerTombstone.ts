import mongoose, { Schema, model, models } from "mongoose";

/**
 * Marks an Invistimo customer whose operational data was deleted.
 * Cron jobs and webhooks use it to avoid recreating sends or calls.
 * Quotes, agreements, and payments stay in their own collections.
 */
const DeletedCustomerTombstoneSchema = new Schema(
  {
    originalUserId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    eventIds: { type: [Schema.Types.ObjectId], default: [], index: true },
    invitationIds: { type: [Schema.Types.ObjectId], default: [], index: true },
    deletedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export default models.DeletedCustomerTombstone ||
  model("DeletedCustomerTombstone", DeletedCustomerTombstoneSchema);
