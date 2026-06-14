import mongoose, { Schema, model, models } from "mongoose";

const EmployeeForm101Schema = new Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      default: null,
      index: true,
    },

    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },

    storedFileName: {
      type: String,
      required: true,
      trim: true,
    },

    r2Key: {
      type: String,
      required: true,
      index: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    fileType: {
      type: String,
      required: true,
    },

    fileSize: {
      type: Number,
      required: true,
    },

    taxYear: {
      type: Number,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["uploaded", "approved", "rejected"],
      default: "uploaded",
      index: true,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

EmployeeForm101Schema.index({
  employeeId: 1,
  taxYear: 1,
  createdAt: -1,
});

export default models.EmployeeForm101 ||
  model("EmployeeForm101", EmployeeForm101Schema);