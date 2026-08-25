import mongoose, { Schema, Types } from "mongoose";

export type VenueEquipmentAssignmentStatus =
  | "reserved"
  | "out"
  | "returned"
  | "missing"
  | "damaged";

export type VenueEquipmentAssignmentDocument = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId | string;
  hallId: string;
  equipmentId: Types.ObjectId | string;
  eventId?: Types.ObjectId | string | null;
  quantity: number;
  status: VenueEquipmentAssignmentStatus;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
};

const VenueEquipmentAssignmentSchema =
  new Schema<VenueEquipmentAssignmentDocument>(
    {
      ownerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      hallId: { type: String, required: true, trim: true, index: true },
      equipmentId: {
        type: Schema.Types.ObjectId,
        ref: "VenueEquipment",
        required: true,
        index: true,
      },
      eventId: {
        type: Schema.Types.ObjectId,
        ref: "Event",
        default: null,
        index: true,
      },
      quantity: { type: Number, required: true, min: 1 },
      status: {
        type: String,
        enum: ["reserved", "out", "returned", "missing", "damaged"],
        default: "reserved",
        index: true,
      },
      notes: { type: String, default: "", trim: true },
    },
    { timestamps: true }
  );

VenueEquipmentAssignmentSchema.index({ ownerId: 1, hallId: 1, status: 1 });

export default mongoose.models.VenueEquipmentAssignment ||
  mongoose.model<VenueEquipmentAssignmentDocument>(
    "VenueEquipmentAssignment",
    VenueEquipmentAssignmentSchema
  );
