import { Schema, models, model } from "mongoose";

const VenueEventSchema = new Schema(
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
      required: true,
      index: true,
    },

    hallId: {
      type: Schema.Types.ObjectId,
      ref: "VenueHall",
      required: false,
      index: true,
    },

    clientId: {
      type: Schema.Types.ObjectId,
      ref: "VenueClient",
      required: false,
      index: true,
    },

    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: false,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    eventType: {
      type: String,
      trim: true,
      default: "",
    },

    eventDate: {
      type: Date,
      required: true,
      index: true,
    },

    startTime: {
      type: String,
      default: "",
    },

    endTime: {
      type: String,
      default: "",
    },

    expectedGuests: {
      type: Number,
      default: 0,
    },

    confirmedGuests: {
      type: Number,
      default: 0,
    },

    arrivedGuests: {
      type: Number,
      default: 0,
    },

    pricePerGuest: {
      type: Number,
      default: 0,
    },

    totalEstimatedPrice: {
      type: Number,
      default: 0,
    },

    menuStatus: {
      type: String,
      enum: ["not_started", "draft", "sent_to_client", "approved"],
      default: "not_started",
      index: true,
    },

    seatingStatus: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
      index: true,
    },

    rsvpStatus: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
      index: true,
    },

    status: {
      type: String,
      enum: [
        "lead",
        "proposal",
        "booked",
        "planning",
        "ready",
        "completed",
        "cancelled",
      ],
      default: "booked",
      index: true,
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

VenueEventSchema.index({ ownerId: 1, eventDate: 1 });
VenueEventSchema.index({ ownerId: 1, status: 1 });
VenueEventSchema.index({ complexId: 1, hallId: 1, eventDate: 1 });

const VenueEvent = models.VenueEvent || model("VenueEvent", VenueEventSchema);

export default VenueEvent;