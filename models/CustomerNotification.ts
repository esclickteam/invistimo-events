import mongoose, { Schema, Types } from "mongoose";

export type CustomerNotificationSeverity = "info" | "important" | "urgent";
export type CustomerNotificationStatus = "active" | "resolved";

export type CustomerNotificationDocument = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  eventId?: Types.ObjectId | null;
  type: string;
  category: string;
  severity: CustomerNotificationSeverity;
  title: string;
  body: string;
  actionHref: string;
  status: CustomerNotificationStatus;
  readAt?: Date | null;
  resolvedAt?: Date | null;
  resolveReason?: string;
  dedupeKey: string;
  audience: "customer" | "admin";
  customerId?: Types.ObjectId | null;
  pushClaimedAt?: Date | null;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

const CustomerNotificationSchema = new Schema<CustomerNotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      default: null,
      index: true,
    },
    type: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    severity: {
      type: String,
      enum: ["info", "important", "urgent"],
      default: "info",
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "", trim: true },
    actionHref: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["active", "resolved"],
      default: "active",
      index: true,
    },
    readAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    resolveReason: { type: String, default: "", trim: true },
    dedupeKey: { type: String, required: true, trim: true, unique: true },
    audience: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    pushClaimedAt: { type: Date, default: null },
    meta: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true }
);

CustomerNotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
CustomerNotificationSchema.index({ userId: 1, audience: 1, status: 1, createdAt: -1 });
CustomerNotificationSchema.index({ "meta.incidentKey": 1, audience: 1, status: 1 });

export default mongoose.models.CustomerNotification ||
  mongoose.model<CustomerNotificationDocument>(
    "CustomerNotification",
    CustomerNotificationSchema
  );
