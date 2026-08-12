import mongoose, { Schema, models, model } from "mongoose";
import {
  TRANSPORT_STOP_TYPES,
  type TransportStopType,
} from "@/lib/transportation/types";

export interface ITransportStop {
  eventId: mongoose.Types.ObjectId;
  routeId: mongoose.Types.ObjectId;
  name: string;
  address?: string;
  time?: string;
  sortOrder: number;
  notes?: string;
  landmark?: string;
  mapLink?: string;
  stopType: TransportStopType;
  createdAt?: Date;
  updatedAt?: Date;
}

const TransportStopSchema = new Schema<ITransportStop>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    routeId: {
      type: Schema.Types.ObjectId,
      ref: "TransportRoute",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: "" },
    time: { type: String, trim: true, default: "" },
    sortOrder: { type: Number, default: 0, index: true },
    notes: { type: String, trim: true, default: "" },
    landmark: { type: String, trim: true, default: "" },
    mapLink: { type: String, trim: true, default: "" },
    stopType: {
      type: String,
      enum: TRANSPORT_STOP_TYPES,
      default: "pickup",
    },
  },
  { timestamps: true }
);

TransportStopSchema.index({ routeId: 1, sortOrder: 1 });
TransportStopSchema.index({ eventId: 1, routeId: 1 });

export default models.TransportStop ||
  model<ITransportStop>("TransportStop", TransportStopSchema);
