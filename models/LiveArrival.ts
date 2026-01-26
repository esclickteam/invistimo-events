import mongoose, { Schema, models } from "mongoose";

/* ===========================================================
   🚫 PRODUCER ONLY – DO NOT EXPOSE TO CLIENT
=========================================================== */
const LiveArrivalSchema = new Schema(
  {
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

    arrivedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    arrivedAt: {
      type: Date,
      default: null,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User", // producer / staff
      required: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

/* 🧠 One live record per guest per event */
LiveArrivalSchema.index(
  { invitationId: 1, guestId: 1 },
  { unique: true }
);

export default models.LiveArrival ||
  mongoose.model("LiveArrival", LiveArrivalSchema);
