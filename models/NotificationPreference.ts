import mongoose, { Schema, Types } from "mongoose";

export type PushPreferenceToggles = {
  rsvp: boolean;
  failures: boolean;
  eventManagement: boolean;
  reminders: boolean;
};

export type NotificationPreferenceDocument = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  push: PushPreferenceToggles;
  createdAt: Date;
  updatedAt: Date;
};

const NotificationPreferenceSchema = new Schema<NotificationPreferenceDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    push: {
      rsvp: { type: Boolean, default: true },
      failures: { type: Boolean, default: true },
      eventManagement: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default mongoose.models.NotificationPreference ||
  mongoose.model<NotificationPreferenceDocument>(
    "NotificationPreference",
    NotificationPreferenceSchema
  );
