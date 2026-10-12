import mongoose, { Schema, Types } from "mongoose";

export type WebPushPlatform = "ios" | "android" | "desktop" | "unknown";

export type WebPushSubscriptionDocument = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  endpoint: string;
  p256dh: string;
  auth: string;
  expirationTime?: Date | null;
  platform: WebPushPlatform;
  label: string;
  userAgent: string;
  failureCount: number;
  disabledAt?: Date | null;
  lastSuccessAt?: Date | null;
  lastFailureAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const WebPushSubscriptionSchema = new Schema<WebPushSubscriptionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    endpoint: { type: String, required: true, unique: true, trim: true },
    p256dh: { type: String, required: true, trim: true },
    auth: { type: String, required: true, trim: true },
    expirationTime: { type: Date, default: null },
    platform: {
      type: String,
      enum: ["ios", "android", "desktop", "unknown"],
      default: "unknown",
    },
    label: { type: String, default: "", trim: true },
    userAgent: { type: String, default: "", trim: true },
    failureCount: { type: Number, default: 0 },
    disabledAt: { type: Date, default: null },
    lastSuccessAt: { type: Date, default: null },
    lastFailureAt: { type: Date, default: null },
  },
  { timestamps: true }
);

WebPushSubscriptionSchema.index({ userId: 1, disabledAt: 1 });

export default mongoose.models.WebPushSubscription ||
  mongoose.model<WebPushSubscriptionDocument>(
    "WebPushSubscription",
    WebPushSubscriptionSchema
  );
