import { Schema, models, model } from "mongoose";

const WeddingEventUploadSchema = new Schema(
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
      default: null,
      index: true,
    },
    shareId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["guest", "couple"],
      default: "guest",
      index: true,
    },
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      default: "",
      trim: true,
    },
    originalName: {
      type: String,
      default: "",
      trim: true,
    },
    uploadedByName: {
      type: String,
      default: "אורח",
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

WeddingEventUploadSchema.index({ invitationId: 1, expiresAt: 1, createdAt: -1 });
WeddingEventUploadSchema.index({ shareId: 1, expiresAt: 1, createdAt: -1 });

const WeddingEventUpload =
  models.WeddingEventUpload || model("WeddingEventUpload", WeddingEventUploadSchema);

export default WeddingEventUpload;
