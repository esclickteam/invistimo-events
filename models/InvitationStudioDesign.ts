import mongoose, { Schema, models, model } from "mongoose";

const InvitationStudioDesignSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      default: null,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      default: null,
      index: true,
    },
    templateId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },
    snapshot: { type: Schema.Types.Mixed, required: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

InvitationStudioDesignSchema.index({ ownerId: 1, updatedAt: -1 });

export default models.InvitationStudioDesign ||
  model("InvitationStudioDesign", InvitationStudioDesignSchema);
