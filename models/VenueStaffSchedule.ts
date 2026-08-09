import mongoose, { Schema, Types, models, model } from "mongoose";

/**
 * Persisted shift board for a venue (replaces client saveMock).
 * Completely separate from Invistimo softphone / work sessions.
 */
export type VenueStaffScheduleDocument = {
  _id: Types.ObjectId;
  venueId: string;
  ownerId: Types.ObjectId;
  weekStart: string;
  shifts: any[];
  absences: any[];
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

const VenueStaffScheduleSchema = new Schema<VenueStaffScheduleDocument>(
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
    weekStart: {
      type: String,
      required: true,
      trim: true,
    },
    shifts: {
      type: Schema.Types.Mixed,
      default: [],
    },
    absences: {
      type: Schema.Types.Mixed,
      default: [],
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

VenueStaffScheduleSchema.index(
  { venueId: 1, weekStart: 1 },
  { unique: true }
);

export default models.VenueStaffSchedule ||
  model<VenueStaffScheduleDocument>(
    "VenueStaffSchedule",
    VenueStaffScheduleSchema
  );
