import mongoose, { Schema, models, model } from "mongoose";

const MobileRefreshTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    familyId: {
      type: String,
      required: true,
      index: true,
    },
    authVersion: {
      type: Number,
      default: 0,
      index: true,
    },
    deviceLabel: {
      type: String,
      default: "",
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByHash: {
      type: String,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

MobileRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.MobileRefreshToken ||
  model("MobileRefreshToken", MobileRefreshTokenSchema);
