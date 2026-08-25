import mongoose, { Schema, Types } from "mongoose";

export type VenueEquipmentStatus = "active" | "retired";

export type VenueEquipmentDocument = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId | string;
  hallId: string;
  name: string;
  sku: string;
  quantity: number;
  notes: string;
  status: VenueEquipmentStatus;
  createdAt: Date;
  updatedAt: Date;
};

const VenueEquipmentSchema = new Schema<VenueEquipmentDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hallId: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, default: "", trim: true },
    quantity: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["active", "retired"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

VenueEquipmentSchema.index({ ownerId: 1, hallId: 1, name: 1 });

export default mongoose.models.VenueEquipment ||
  mongoose.model<VenueEquipmentDocument>("VenueEquipment", VenueEquipmentSchema);
