import mongoose, { Schema, model, models } from "mongoose";

const ContactInquiryMeasurementSchema = new Schema(
  {
    submissionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "sent",
        "skipped_consent",
        "skipped_config",
        "failed",
        "failed_unconfirmed",
      ],
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
    },
    claimedAt: {
      type: Date,
      required: true,
    },
    hadClientId: {
      type: Boolean,
      default: false,
    },
    hadSessionId: {
      type: Boolean,
      default: false,
    },
    skipReason: {
      type: String,
      default: "",
    },
  },
  {
    collection: "contactinquirymeasurements",
  }
);

export type ContactInquiryMeasurementDoc = {
  submissionId: string;
  status: string;
  attempts: number;
  claimedAt: Date;
  hadClientId?: boolean;
  hadSessionId?: boolean;
  skipReason?: string;
};

export default models.ContactInquiryMeasurement ||
  model("ContactInquiryMeasurement", ContactInquiryMeasurementSchema);
