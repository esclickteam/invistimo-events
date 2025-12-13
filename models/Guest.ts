import mongoose from "mongoose";

const GuestSchema = new mongoose.Schema(
  {
    invitationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    token: {
      type: String,
      required: true,
    },

    rsvp: {
      type: String,
      enum: ["yes", "no", "pending"],
      default: "pending",
    },

    tableName: {
      type: String,
      default: null,
    },

    guestsCount: {
      type: Number,
      default: 1,
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Guest ||
  mongoose.model("Guest", GuestSchema);
