// models/EventLogisticsStep.ts
import mongoose from "mongoose";

const EventLogisticsStepSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    time: String,              // "14:00"
    title: String,             // "הגעת ספק מרכזי"
    phone: String,

    status: {
      type: String,
      enum: ["pending", "missing", "done"],
      default: "pending",
    },

    source: {
      type: String,
      enum: ["manual", "template", "supplier"],
      default: "manual",
    },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.EventLogisticsStep ||
  mongoose.model("EventLogisticsStep", EventLogisticsStepSchema);
