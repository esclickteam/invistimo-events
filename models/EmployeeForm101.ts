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
     * idCardAppendix = ספח תעודת זהות
     * accountManagement = אישור ניהול חשבון
     * payslip = תלוש שכר
     */
    documentType: {
      type: String,
      enum: [
        "form101",
        "idCard",
        "idCardAppendix",
        "accountManagement",
        "payslip",
      ],
      default: "form101",
      required: true,
      index: true,
    },

    /**
     * חודש תלוש שכר.
     * רלוונטי בעיקר למסמכים מסוג payslip.
     * פורמט מומלץ: YYYY-MM
     * לדוגמה: 2026-07
     */
    payrollMonth: {
      type: String,
      default: "",
      trim: true,
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
     * לתעודת זהות/אישור ניהול חשבון/תלוש שכר נשמור גם שנה כדי שיהיה קל לשלוף.
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
  },
);

/**
 * שליפה מהירה של כל המסמכים של עובד לפי שנה וסוג מסמך
 */
EmployeeForm101Schema.index({
  employeeId: 1,
  taxYear: 1,
  documentType: 1,
  createdAt: -1,
});

/**
 * שליפה מהירה של תלושי שכר לפי עובד וחודש
 * מאפשר כמה תלושים באותו חודש, בלי unique.
 */
EmployeeForm101Schema.index({
  employeeId: 1,
  documentType: 1,
  payrollMonth: 1,
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
 * שליפה מהירה של תלושים לפי עסק וחודש
 */
EmployeeForm101Schema.index({
  businessId: 1,
  documentType: 1,
  payrollMonth: 1,
  createdAt: -1,
});

/**
 * שלא יהיו כפילויות פעילות אם תרצי בעתיד להשתמש בזה.
 * כרגע אין unique כדי לאפשר כמה תלושי שכר באותו חודש
 * וגם כדי לא לשבור העלאות קודמות.
 */

export default models.EmployeeForm101 ||
  model("EmployeeForm101", EmployeeForm101Schema);