import mongoose, { Schema, models, model } from "mongoose";
import {
  TRANSPORT_BOARD_STATUSES,
  TRANSPORT_REGISTRATION_STATUSES,
  type TransportBoardStatus,
  type TransportRegistrationStatus,
} from "@/lib/transportation/types";

export interface ITransportRegistration {
  eventId: mongoose.Types.ObjectId;
  invitationGuestId?: mongoose.Types.ObjectId | null;
  name: string;
  phone?: string;
  passengerCount: number;
  needsOutbound: boolean;
  outboundRouteId?: mongoose.Types.ObjectId | null;
  outboundStopId?: mongoose.Types.ObjectId | null;
  needsReturn: boolean;
  returnRouteId?: mongoose.Types.ObjectId | null;
  returnStopId?: mongoose.Types.ObjectId | null;
  notes?: string;
  status: TransportRegistrationStatus;
  waitlistedAt?: Date | null;
  promotedAt?: Date | null;
  rejectedAt?: Date | null;
  outboundBoardStatus: TransportBoardStatus;
  returnBoardStatus: TransportBoardStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const TransportRegistrationSchema = new Schema<ITransportRegistration>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    invitationGuestId: {
      type: Schema.Types.ObjectId,
      ref: "InvitationGuest",
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    passengerCount: { type: Number, required: true, min: 1, default: 1 },
    needsOutbound: { type: Boolean, default: false },
    outboundRouteId: {
      type: Schema.Types.ObjectId,
      ref: "TransportRoute",
      default: null,
      index: true,
    },
    outboundStopId: {
      type: Schema.Types.ObjectId,
      ref: "TransportStop",
      default: null,
      index: true,
    },
    needsReturn: { type: Boolean, default: false },
    returnRouteId: {
      type: Schema.Types.ObjectId,
      ref: "TransportRoute",
      default: null,
      index: true,
    },
    returnStopId: {
      type: Schema.Types.ObjectId,
      ref: "TransportStop",
      default: null,
      index: true,
    },
    notes: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: TRANSPORT_REGISTRATION_STATUSES,
      default: "registered",
      index: true,
    },
    waitlistedAt: { type: Date, default: null, index: true },
    promotedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    outboundBoardStatus: {
      type: String,
      enum: TRANSPORT_BOARD_STATUSES,
      default: "registered",
      index: true,
    },
    returnBoardStatus: {
      type: String,
      enum: TRANSPORT_BOARD_STATUSES,
      default: "not_needed",
      index: true,
    },
  },
  { timestamps: true }
);

TransportRegistrationSchema.index({ eventId: 1, status: 1 });
TransportRegistrationSchema.index({ eventId: 1, name: 1 });
TransportRegistrationSchema.index({ eventId: 1, phone: 1 });
TransportRegistrationSchema.index({ eventId: 1, status: 1, createdAt: 1 });
TransportRegistrationSchema.index(
  { eventId: 1, invitationGuestId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      invitationGuestId: { $type: "objectId" },
      status: { $in: ["registered", "waitlisted"] },
    },
  }
);

export default models.TransportRegistration ||
  model<ITransportRegistration>(
    "TransportRegistration",
    TransportRegistrationSchema
  );
