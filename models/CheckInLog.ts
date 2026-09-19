import mongoose, { Schema, models } from "mongoose";

const CheckInLogSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      index: true,
    },

    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      index: true,
    },

    invitationGuestId: {
      type: Schema.Types.ObjectId,
      ref: "InvitationGuest",
      required: true,
      index: true,
    },

    scannedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    scannedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    quantityAdded: {
      type: Number,
      required: true,
    },

    previousCheckedInCount: {
      type: Number,
      required: true,
      min: 0,
    },

    newCheckedInCount: {
      type: Number,
      required: true,
      min: 0,
    },

    method: {
      type: String,
      enum: ["QR", "MANUAL"],
      required: true,
      index: true,
    },

    deviceSession: {
      type: String,
      default: null,
      trim: true,
    },

    overridden: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

CheckInLogSchema.index({ invitationGuestId: 1, scannedAt: -1 });
CheckInLogSchema.index({ eventId: 1, scannedAt: -1 });

export default models.CheckInLog ||
  mongoose.model("CheckInLog", CheckInLogSchema);
