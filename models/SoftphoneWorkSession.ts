import mongoose, { Schema, model, models } from "mongoose";

export type SoftphoneWorkSessionStatus = "open" | "closed";

const SoftphoneWorkSessionSchema = new Schema(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    employeeIdString: {
      type: String,
      default: "",
      index: true,
    },

    businessId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    businessIdString: {
      type: String,
      default: "",
      index: true,
    },

    date: {
      type: String,
      required: true,
      index: true,
      // YYYY-MM-DD
    },

    month: {
      type: String,
      required: true,
      index: true,
      // YYYY-MM
    },

    startedAt: {
      type: Date,
      required: true,
      index: true,
    },

    endedAt: {
      type: Date,
      default: null,
      index: true,
    },

    totalMinutes: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },

    source: {
      type: String,
      default: "softphone",
    },

    startMeta: {
      type: Schema.Types.Mixed,
      default: {},
    },

    endMeta: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

SoftphoneWorkSessionSchema.index({
  employeeId: 1,
  month: 1,
  status: 1,
});

SoftphoneWorkSessionSchema.index({
  employeeIdString: 1,
  month: 1,
  status: 1,
});

SoftphoneWorkSessionSchema.index({
  employeeId: 1,
  date: 1,
});

SoftphoneWorkSessionSchema.index({
  businessId: 1,
  month: 1,
});

const SoftphoneWorkSession =
  models.SoftphoneWorkSession ||
  model("SoftphoneWorkSession", SoftphoneWorkSessionSchema);

export default SoftphoneWorkSession;