import mongoose, { Schema, models, model } from "mongoose";
import { nanoid } from "nanoid";
import type { CustomMissionTargetingType, MissionCategory, MissionDifficulty } from "@/lib/weddingChallenges/types";

const WeddingChallengeMissionSchema = new Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    missionKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    text: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["dancefloor", "shots", "table", "chaos", "cheeky", "boss"],
      required: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    requiresAlcohol: { type: Boolean, default: false },
    boss: { type: Boolean, default: false },
    minPeople: { type: Number, default: 2, min: 1 },
    maxPeople: { type: Number, default: null },
    tableBased: { type: Boolean, default: false },
    active: { type: Boolean, default: true, index: true },
    weight: { type: Number, default: 10, min: 1, max: 100 },
    cooldownWeight: { type: Number, default: 1, min: 1 },
    maxAssignments: { type: Number, default: null },
    assignedCount: { type: Number, default: 0, min: 0 },
    hint: { type: String, default: "", trim: true },
    targetingType: {
      type: String,
      enum: [
        "ALL_ELIGIBLE_GUESTS",
        "RANDOM_GUESTS",
        "SPECIFIC_TABLES",
        "SPECIFIC_GUESTS",
      ],
      default: "ALL_ELIGIBLE_GUESTS",
    },
    targetingCount: { type: Number, default: null },
    targetingTableIds: { type: [String], default: [] },
    targetingGuestIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

WeddingChallengeMissionSchema.index({ eventId: 1, active: 1 });

WeddingChallengeMissionSchema.pre("validate", function generateKey() {
  if (!this.missionKey) {
    this.missionKey = `custom-${nanoid(10)}`;
  }
});

export type WeddingChallengeMissionCategory = MissionCategory;
export type WeddingChallengeMissionDifficulty = MissionDifficulty;
export type WeddingChallengeMissionTargeting = CustomMissionTargetingType;

const WeddingChallengeMission =
  models.WeddingChallengeMission ||
  model("WeddingChallengeMission", WeddingChallengeMissionSchema);

export default WeddingChallengeMission;
