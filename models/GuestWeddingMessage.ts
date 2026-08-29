import mongoose, { Schema, models, model } from "mongoose";

export type GuestWeddingMessageStatus = "unread" | "read";

const GuestWeddingMessageSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      default: null,
      index: true,
    },
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
      index: true,
    },
    guestId: {
      type: Schema.Types.ObjectId,
      ref: "InvitationGuest",
      required: true,
      index: true,
    },
    weddingWebsiteId: {
      type: String,
      default: "",
      trim: true,
    },
    sender: {
      type: String,
      enum: ["guest", "couple"],
      default: "guest",
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    readAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

GuestWeddingMessageSchema.index({ invitationId: 1, createdAt: -1 });
GuestWeddingMessageSchema.index({ invitationId: 1, status: 1 });
GuestWeddingMessageSchema.index({ guestId: 1, createdAt: -1 });

const GuestWeddingMessage =
  models.GuestWeddingMessage ||
  model("GuestWeddingMessage", GuestWeddingMessageSchema);

export default GuestWeddingMessage;
export { mongoose };
