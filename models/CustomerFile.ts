import mongoose, { Schema, model, models } from "mongoose";

const CustomerFileSchema = new Schema(
  {
    // לא חובה — כי תיק לקוח יכול להיווצר כבר בשלב הצעת מחיר / הסכם
    // לפני שנפתח ללקוח משתמש בפועל במערכת
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
      index: true,
    },

    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: false,
      default: null,
      index: true,
    },

    fullName: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      index: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    eventDate: {
      type: Date,
      default: null,
      index: true,
    },

    venueName: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    packageName: {
      type: String,
      default: "",
      trim: true,
    },

    // מחיר החבילה/עסקה הנוכחית
    packageBasePrice: {
      type: Number,
      default: 0,
    },

    // מחיר יעד אם משדרגים לחבילה עם סבבי שיחות
    packageTargetPriceWithCalls: {
      type: Number,
      default: 0,
    },

    hasCallRounds: {
      type: Boolean,
      default: false,
      index: true,
    },

    allowedCallRounds: {
      type: Number,
      default: 0,
    },

    totalPrice: {
      type: Number,
      default: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    balance: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["lead", "quote_sent", "paid", "active", "completed", "cancelled"],
      default: "lead",
      index: true,
    },

    assignedStaffIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
      index: true,
    },

    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default models.CustomerFile ||
  model("CustomerFile", CustomerFileSchema);