import mongoose, { Schema, models, model } from "mongoose";
import {
  defaultWeddingChallengeSettings,
  normalizeWeddingChallengeSettings,
} from "@/lib/weddingChallenges/settings";
import type { WeddingChallengeSettings } from "@/lib/weddingChallenges/types";

const EnabledCategoriesSchema = new Schema(
  {
    dancefloor: { type: Boolean, default: true },
    shots: { type: Boolean, default: true },
    table: { type: Boolean, default: true },
    chaos: { type: Boolean, default: true },
    cheeky: { type: Boolean, default: true },
    boss: { type: Boolean, default: true },
  },
  { _id: false }
);

const GiveawaySchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    prizeText: { type: String, default: "", trim: true },
    prizeCost: { type: Number, default: 0, min: 0 },
    revealMode: {
      type: String,
      enum: ["after_first", "after_second", "manual"],
      default: "after_first",
    },
    bossEntries: { type: Number, enum: [2, 3], default: 2 },
    maxEntriesPerGuest: { type: Number, default: null },
    autoDrawAtEnd: { type: Boolean, default: true },
    drawMode: {
      type: String,
      enum: ["AUTO_DRAW_AT_TIME", "MANUAL_DRAW"],
      default: "MANUAL_DRAW",
    },
    drawAt: { type: Date, default: null },
    entriesCutoffAt: { type: Date, default: null },
    locked: { type: Boolean, default: false },
    revealedByAdmin: { type: Boolean, default: false },
    winnerGuestId: { type: String, default: null },
    winnerName: { type: String, default: "", trim: true },
    drawnAt: { type: Date, default: null },
  },
  { _id: false }
);

const SmsSchema = new Schema(
  {
    template: { type: String, enum: ["full", "short"], default: "full" },
    timezone: { type: String, default: "Asia/Jerusalem", trim: true },
    scheduledAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["idle", "scheduled", "sending", "sent", "cancelled"],
      default: "idle",
    },
    sentAt: { type: Date, default: null },
    sentCount: { type: Number, default: 0, min: 0 },
    cancelledAt: { type: Date, default: null },
  },
  { _id: false }
);

const SettingsSchema = new Schema(
  {
    enabled: { type: Boolean, default: false, index: true },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    maxMissionsPerGuest: { type: Number, default: 5, min: 1, max: 5 },
    allowAlcoholMissions: { type: Boolean, default: true },
    pacingMode: {
      type: String,
      enum: ["immediate", "timed", "admin"],
      default: "immediate",
    },
    cooldownMinutes: { type: Number, default: 0, min: 0 },
    tableCooldownMinutes: { type: Number, default: 12, min: 0 },
    tableCooldownMissions: { type: Number, default: 3, min: 0 },
    skipEnabled: { type: Boolean, default: true },
    maxSkipsPerGuest: { type: Number, default: 1, min: 0, max: 2 },
    enabledCategories: { type: EnabledCategoriesSchema, default: () => ({}) },
    giveaway: { type: GiveawaySchema, default: () => ({}) },
    sms: { type: SmsSchema, default: () => ({}) },
  },
  { _id: false }
);

const WeddingChallengeConfigSchema = new Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
      index: true,
    },
    invitationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invitation",
      default: null,
      index: true,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ["EXISTING_EVENT", "STANDALONE_GAME"],
      default: "EXISTING_EVENT",
      index: true,
    },
    settings: {
      type: SettingsSchema,
      default: () => defaultWeddingChallengeSettings(),
    },
  },
  { timestamps: true }
);

WeddingChallengeConfigSchema.pre("validate", function () {
  const doc = this as any;
  doc.settings = normalizeWeddingChallengeSettings(doc.settings);
});

export function serializeChallengeSettings(raw: any): WeddingChallengeSettings {
  return normalizeWeddingChallengeSettings(raw);
}

const WeddingChallengeConfig =
  models.WeddingChallengeConfig ||
  model("WeddingChallengeConfig", WeddingChallengeConfigSchema);

export default WeddingChallengeConfig;
