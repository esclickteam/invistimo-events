import mongoose, { Schema, models, model } from "mongoose";

export type VenueLeadStatus =
  | "new"
  | "contacted"
  | "meeting"
  | "proposal"
  | "negotiation"
  | "closed"
  | "lost";

export type VenueLeadActivityType =
  | "call"
  | "note"
  | "meeting"
  | "proposal"
  | "contract"
  | "sms";

const VenueLeadActivitySchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["call", "note", "meeting", "proposal", "contract", "sms"],
      default: "note",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    date: {
      type: String,
      default: "",
      trim: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const VenueLeadSchema = new Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    hallId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },

    eventType: {
      type: String,
      default: "",
      trim: true,
    },

    requestedDate: {
      type: String,
      default: "",
      trim: true,
    },

    preferredHall: {
      type: String,
      default: "",
      trim: true,
    },

    guests: {
      type: Number,
      default: 0,
    },

    budget: {
      type: Number,
      default: 0,
    },

    source: {
      type: String,
      default: "",
      trim: true,
    },

    owner: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "meeting",
        "proposal",
        "negotiation",
        "closed",
        "lost",
      ],
      default: "new",
      index: true,
    },

    lastActivity: {
      type: String,
      default: "ליד חדש",
      trim: true,
    },

    eventId: {
      type: String,
      default: "",
      trim: true,
    },

    meetingAt: {
      type: String,
      default: "",
      trim: true,
    },

    proposalFileName: {
      type: String,
      default: "",
      trim: true,
    },

    contractFileName: {
      type: String,
      default: "",
      trim: true,
    },

    proposalSignature: {
      type: String,
      default: "",
      trim: true,
    },

    contractSignature: {
      type: String,
      default: "",
      trim: true,
    },

    activities: {
      type: [VenueLeadActivitySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

VenueLeadSchema.index({ ownerId: 1, hallId: 1, createdAt: -1 });
VenueLeadSchema.index({ ownerId: 1, hallId: 1, status: 1 });
VenueLeadSchema.index({ ownerId: 1, hallId: 1, phone: 1 });
VenueLeadSchema.index({ ownerId: 1, hallId: 1, email: 1 });

const VenueLead =
  models.VenueLead || model("VenueLead", VenueLeadSchema);

export default VenueLead;