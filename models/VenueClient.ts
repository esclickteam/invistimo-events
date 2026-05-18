import { Schema, models, model } from "mongoose";

const VenueClientSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    complexId: {
      type: Schema.Types.ObjectId,
      ref: "VenueComplex",
      required: false,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    eventType: {
      type: String,
      trim: true,
      default: "",
    },

    requestedDate: {
      type: Date,
      default: null,
    },

    estimatedGuests: {
      type: Number,
      default: 0,
    },

    budget: {
      type: Number,
      default: 0,
    },

    leadSource: {
      type: String,
      enum: [
        "website",
        "facebook",
        "instagram",
        "google",
        "recommendation",
        "phone",
        "walk_in",
        "other",
      ],
      default: "other",
    },

    status: {
      type: String,
      enum: [
        "new_lead",
        "contacted",
        "meeting_scheduled",
        "meeting_done",
        "quote_sent",
        "negotiation",
        "closed_won",
        "closed_lost",
        "active_event",
      ],
      default: "new_lead",
      index: true,
    },

    notes: {
      type: String,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },

    lastContactAt: {
      type: Date,
      default: null,
    },

    nextFollowUpAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

VenueClientSchema.index({ ownerId: 1, status: 1 });
VenueClientSchema.index({ ownerId: 1, createdAt: -1 });

const VenueClient =
  models.VenueClient || model("VenueClient", VenueClientSchema);

export default VenueClient;