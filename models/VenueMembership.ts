import mongoose, { Schema, Types, models, model } from "mongoose";
import {
  VENUE_ROLES,
  type VenueRole,
  type VenuePermission,
} from "@/lib/venues/permissions";

export type VenueMembershipStatus = "active" | "disabled";

export type VenueMembershipDocument = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  venueId: string;
  ownerId: Types.ObjectId;
  role: VenueRole;
  permissions: VenuePermission[];
  status: VenueMembershipStatus;
  mustChangePassword: boolean;
  lastLoginAt?: Date | null;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

const VenueMembershipSchema = new Schema<VenueMembershipDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /**
     * Tenant key = VenueHall.id (string business id)
     */
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

    role: {
      type: String,
      enum: VENUE_ROLES,
      required: true,
      default: "VIEWER",
      index: true,
    },

    permissions: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
      index: true,
    },

    mustChangePassword: {
      type: Boolean,
      default: false,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

VenueMembershipSchema.index({ userId: 1, venueId: 1 }, { unique: true });
VenueMembershipSchema.index({ venueId: 1, status: 1, role: 1 });
VenueMembershipSchema.index({ ownerId: 1, venueId: 1 });

export default models.VenueMembership ||
  model<VenueMembershipDocument>("VenueMembership", VenueMembershipSchema);
