import mongoose, { Schema, models, model } from "mongoose";
import {
  TRANSPORT_DIRECTIONS,
  TRANSPORT_ROUTE_STATUSES,
  type TransportDirection,
  type TransportRouteStatus,
} from "@/lib/transportation/types";

export interface ITransportRoute {
  eventId: mongoose.Types.ObjectId;
  name: string;
  direction: TransportDirection;
  date?: Date | null;
  departureTime?: string;
  returnTime?: string;
  capacity: number;
  companyName?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  notes?: string;
  active: boolean;
  status: TransportRouteStatus;
  sortOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const TransportRouteSchema = new Schema<ITransportRoute>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    direction: {
      type: String,
      enum: TRANSPORT_DIRECTIONS,
      required: true,
      default: "outbound",
      index: true,
    },
    date: {
      type: Date,
      default: null,
    },
    departureTime: {
      type: String,
      trim: true,
      default: "",
    },
    returnTime: {
      type: String,
      trim: true,
      default: "",
    },
    capacity: {
      type: Number,
      required: true,
      min: 0,
      default: 50,
    },
    companyName: { type: String, trim: true, default: "" },
    driverName: { type: String, trim: true, default: "" },
    driverPhone: { type: String, trim: true, default: "" },
    vehicleNumber: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true, index: true },
    status: {
      type: String,
      enum: TRANSPORT_ROUTE_STATUSES,
      default: "scheduled",
      index: true,
    },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TransportRouteSchema.index({ eventId: 1, direction: 1, active: 1 });
TransportRouteSchema.index({ eventId: 1, sortOrder: 1 });

export default models.TransportRoute ||
  model<ITransportRoute>("TransportRoute", TransportRouteSchema);
