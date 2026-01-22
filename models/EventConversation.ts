import mongoose from "mongoose";

const DecisionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    createdTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventTask",
      default: undefined,
    },
  },
  { _id: false }
);

const EventConversationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["meeting", "call", "note"],
      required: true,
    },

    entityType: {
      type: String,
      enum: ["couple", "supplier", "venue", "other"],
      required: true,
    },

    entityName: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: String, // yyyy-mm-dd
      required: true,
    },

    summary: {
      type: String,
      default: "",
      trim: true,
    },

    decisions: {
      type: [DecisionSchema],
      default: [],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.EventConversation ||
  mongoose.model("EventConversation", EventConversationSchema);
