import mongoose, { Schema, models, model } from "mongoose";

const EventGiftSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      default: null,
      index: true,
    },

    guestId: {
      type: Schema.Types.ObjectId,
      ref: "InvitationGuest",
      default: null,
      index: true,
    },

    guestName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    relation: {
      type: String,
      default: "",
      trim: true,
    },

    arrivalStatus: {
      type: String,
      enum: ["coming", "not_coming", "pending", "unknown", ""],
      default: "",
    },

    confirmedCount: {
      type: Number,
      default: null,
    },

    giftAmount: {
      type: Number,
      default: 0,
    },

    paymentMethod: {
      type: String,
      enum: [
        "cash",
        "bit",
        "paybox",
        "checks",
        "bank_transfer",
        "credit_gifts",
        "other",
        "",
      ],
      default: "",
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    isManual: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

EventGiftSchema.index(
  { eventId: 1, guestId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      guestId: { $type: "objectId" },
    },
  }
);

const EventGift = models.EventGift || model("EventGift", EventGiftSchema);

export default EventGift;