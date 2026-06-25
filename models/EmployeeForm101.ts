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
     * accountManagement = אישור ניהול חשבון
     */
    documentType: {
      type: String,
      enum: ["form101", "idCard", "accountManagement"],
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
     * לתעודת זהות / אישור ניהול חשבון נשמור גם שנה כדי שיהיה קל לשלוף לפי שנה.
     */
    taxYear: {
      type: Number,
      required: true,
      index: true,
    },

    /**
     * הערכים שהעובד מילא בפועל בטופס.
     * זה המקור לצפייה חוזרת בתיק עובד ולייצוא מחדש.
     */
    formFieldValues: {
      type: Schema.Types.Mixed,
      default: {},
    },

    /**
     * צילום מצב של התבנית בזמן שהעובד שלח את הטופס.
     * חשוב מאוד: אם האדמין משנה תבנית בעתיד,
     * טפסים ישנים לא יזוזו ולא ישתנו.
     */
    templateSnapshot: {
      type: Schema.Types.Mixed,
      default: null,
    },

    /**
     * מזהה התבנית המקורית מהאדמין.
     */
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form101Template",
      default: null,
      index: true,
    },

    /**
     * מתי התבנית עודכנה בזמן השליחה.
     */
    templateUpdatedAt: {
      type: Date,
      default: null,
    },

    /**
     * מתי התבנית אושרה בזמן השליחה.
     */
    templateApprovedAt: {
      type: Date,
      default: null,
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
 * שליפה לפי תבנית טופס 101
 */
EmployeeForm101Schema.index({
  templateId: 1,
  createdAt: -1,
});

/**
 * לא שמים unique כדי לא לשבור העלאות / מסמכים קיימים.
 */

export default models.EmployeeForm101 ||
  model("EmployeeForm101", EmployeeForm101Schema);