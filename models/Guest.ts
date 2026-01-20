import mongoose from "mongoose";

const GuestSchema = new mongoose.Schema(
  {
    invitationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    token: {
      type: String,
      required: true,
    },

    /* =====================
       ⭐ קבוצות
    ===================== */
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
      index: true,
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
      min: 1,
    },

    arrivedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Guest ||
  mongoose.model("Guest", GuestSchema);
