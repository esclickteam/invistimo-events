import mongoose, { Schema, models, model } from "mongoose";

const MobilePushDeviceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expoPushToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["ios", "android", "unknown"],
      default: "unknown",
    },
    deviceLabel: {
      type: String,
      default: "",
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

MobilePushDeviceSchema.index({ userId: 1, deviceId: 1 });

export default models.MobilePushDevice ||
  model("MobilePushDevice", MobilePushDeviceSchema);
