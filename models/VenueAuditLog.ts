import mongoose, { Schema, Types, models, model } from "mongoose";

export type VenueAuditLogDocument = {
  _id: Types.ObjectId;
  venueId: string;
  ownerId?: Types.ObjectId | null;
  actorUserId: Types.ObjectId;
  action: string;
  targetType: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

const VenueAuditLogSchema = new Schema<VenueAuditLogDocument>(
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
      default: null,
      index: true,
    },

    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    targetType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    targetId: {
      type: String,
      default: "",
      trim: true,
    },

    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

VenueAuditLogSchema.index({ venueId: 1, createdAt: -1 });

export default models.VenueAuditLog ||
  model<VenueAuditLogDocument>("VenueAuditLog", VenueAuditLogSchema);
