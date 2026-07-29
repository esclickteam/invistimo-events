import mongoose, { Schema, model, models } from "mongoose";

const CustomerFileSchema = new Schema(
  {
    // תיק לקוח יכול להיווצר כליד לפני שנפתח User בפועל
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

    packageBasePrice: {
      type: Number,
      default: 0,
    },

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

    /* =========================================================
       פרטי ליד מקצועיים — Facebook / Make
    ========================================================= */

    leadSource: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    leadProvider: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    leadStatus: {
      type: String,
      enum: ["new", "contacted", "quote_sent", "converted", "lost"],
      default: "new",
      index: true,
    },

    guestsCount: {
      type: Number,
      default: 0,
      index: true,
    },

    interestedService: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    facebookLeadId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    campaignName: {
      type: String,
      default: "",
      trim: true,
    },

    adName: {
      type: String,
      default: "",
      trim: true,
    },

    formName: {
      type: String,
      default: "",
      trim: true,
    },

    rawLeadData: {
      type: Schema.Types.Mixed,
      default: null,
    },

    source: {
      type: String,
      default: "",
      trim: true,
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

    // מצביעים למסמכי מכירה אחרונים שנשלחו ללקוח
    quoteToken: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    agreementToken: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    signedAgreementToken: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    salesDocumentToken: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
  },
  { timestamps: true }
);

CustomerFileSchema.index({ phone: 1, leadSource: 1 });
CustomerFileSchema.index({ email: 1, leadSource: 1 });
CustomerFileSchema.index({ facebookLeadId: 1, leadProvider: 1 });

export default models.CustomerFile ||
  model("CustomerFile", CustomerFileSchema);