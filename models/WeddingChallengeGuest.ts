import mongoose, { Schema, models, model } from "mongoose";
import type { MissionCategory } from "@/lib/weddingChallenges/types";

const WeddingChallengeGuestSchema = new Schema(
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
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tableId: {
      type: String,
      default: null,
      index: true,
    },
    isAdult: {
      type: Boolean,
      default: true,
    },
    completedMissionIds: {
      type: [String],
      default: [],
    },
    skippedMissionIds: {
      type: [String],
      default: [],
    },
    activeMissionId: {
      type: String,
      default: null,
    },
    activeAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    completedCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    skipCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    giveawayEntries: {
      type: Number,
      default: 0,
      min: 0,
    },
    giveawayRevealedAt: {
      type: Date,
      default: null,
    },
    lastMissionCategory: {
      type: String,
      default: null,
    },
    lastCompletedAt: {
      type: Date,
      default: null,
    },
    lastAssignedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

WeddingChallengeGuestSchema.index({ eventId: 1, guestId: 1 }, { unique: true });
WeddingChallengeGuestSchema.index({ eventId: 1, tableId: 1 });
WeddingChallengeGuestSchema.index({ eventId: 1, giveawayEntries: -1 });

export type WeddingChallengeGuestCategory = MissionCategory | null;

const WeddingChallengeGuest =
  models.WeddingChallengeGuest ||
  model("WeddingChallengeGuest", WeddingChallengeGuestSchema);

export default WeddingChallengeGuest;
