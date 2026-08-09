import mongoose, { Schema, Types, models, model } from "mongoose";

/**
 * VenueEmployee = operational worker of a hall (shift staff etc.).
 * Completely separate from Invistimo Staff / Employee* models.
 * Login is optional via userId → VenueMembership.
 */
export type VenueEmployeeStatus = "active" | "inactive";

export type VenueEmployeeDocument = {
  _id: Types.ObjectId;
  venueId: string;
  ownerId: Types.ObjectId;
  fullName: string;
  phone: string;
  email?: string;
  jobTitle: string;
  status: VenueEmployeeStatus;
  userId?: Types.ObjectId | null;
  notes?: string;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

const VenueEmployeeSchema = new Schema<VenueEmployeeDocument>(
  {
    venueId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    fullName: {
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
      trim: true,
      lowercase: true,
    },

    jobTitle: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

VenueEmployeeSchema.index({ venueId: 1, status: 1, fullName: 1 });
VenueEmployeeSchema.index({ venueId: 1, phone: 1 });
VenueEmployeeSchema.index(
  { venueId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $type: "objectId" } },
  }
);

export default models.VenueEmployee ||
  model<VenueEmployeeDocument>("VenueEmployee", VenueEmployeeSchema);
