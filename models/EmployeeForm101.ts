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

    /**
     * סוג המסמך:
     * form101 = טופס 101
     * idCard = תעודת זהות
     */
    documentType: {
      type: String,
      enum: ["form101", "idCard"],
      default: "form101",
      required: true,
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

    /**
     * שנת מס.
     * לטופס 101 זה חובה לוגית.
     * לתעודת זהות נשמור גם את אותה שנה כדי שיהיה קל לשלוף לפי שנה.
     */
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

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * שליפה מהירה של כל המסמכים של עובד לפי שנה
 */
EmployeeForm101Schema.index({
  employeeId: 1,
  taxYear: 1,
  documentType: 1,
  createdAt: -1,
});

/**
 * שליפה מהירה לפי עסק
 */
EmployeeForm101Schema.index({
  businessId: 1,
  taxYear: 1,
  documentType: 1,
  createdAt: -1,
});

/**
 * שלא יהיו כפילויות פעילות אם תרצי בעתיד להשתמש בזה.
 * כרגע אני לא שם unique כדי לא לשבור העלאות קודמות.
 */

export default models.EmployeeForm101 ||
  model("EmployeeForm101", EmployeeForm101Schema);