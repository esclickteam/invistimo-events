import mongoose, { Schema, models, model } from "mongoose";

export interface IEventTransportation {
  eventId: mongoose.Types.ObjectId;
  invitationId?: mongoose.Types.ObjectId | null;
  enabled: boolean;
  guestRegistrationEnabled: boolean;
  waitlistEnabled: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const EventTransportationSchema = new Schema<IEventTransportation>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
      index: true,
    },
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      default: null,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    guestRegistrationEnabled: {
      type: Boolean,
      default: true,
    },
    waitlistEnabled: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default models.EventTransportation ||
  model<IEventTransportation>("EventTransportation", EventTransportationSchema);
