import mongoose, { Schema, models, model } from "mongoose";

const WeddingChallengeAssignmentSchema = new Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    invitationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
      index: true,
    },
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InvitationGuest",
      required: true,
      index: true,
    },
    tableId: {
      type: String,
      default: null,
      index: true,
    },
    missionId: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["assigned", "revealed", "completed", "skipped", "expired"],
      default: "assigned",
      index: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    revealedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    skippedAt: {
      type: Date,
      default: null,
    },
    giveawayEntriesAwarded: {
      type: Number,
      default: 0,
      min: 0,
    },
    boss: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

WeddingChallengeAssignmentSchema.index({ eventId: 1, guestId: 1, assignedAt: -1 });
WeddingChallengeAssignmentSchema.index({ eventId: 1, tableId: 1, status: 1, assignedAt: -1 });
WeddingChallengeAssignmentSchema.index({ eventId: 1, missionId: 1, status: 1 });

const WeddingChallengeAssignment =
  models.WeddingChallengeAssignment ||
  model("WeddingChallengeAssignment", WeddingChallengeAssignmentSchema);

export default WeddingChallengeAssignment;
