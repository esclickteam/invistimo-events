import mongoose, { Schema, Types, models, model } from "mongoose";

export const VENUE_FILE_KINDS = [
  "proposal",
  "contract",
  "document",
  "hall_image",
  "other",
] as const;

export type VenueFileKind = (typeof VENUE_FILE_KINDS)[number];

export type VenueFileDocument = {
  _id: Types.ObjectId;
  venueId: string;
  ownerId: Types.ObjectId;
  kind: VenueFileKind;
  url: string;
  publicId: string;
  originalName: string;
  mimeType: string;
  size: number;
  relatedLeadId?: string;
  relatedEventId?: string;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const VenueFileSchema = new Schema<VenueFileDocument>(
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

    kind: {
      type: String,
      enum: VENUE_FILE_KINDS,
      default: "other",
      index: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    publicId: {
      type: String,
      required: true,
      trim: true,
    },

    originalName: {
      type: String,
      default: "",
      trim: true,
    },

    mimeType: {
      type: String,
      default: "",
      trim: true,
    },

    size: {
      type: Number,
      default: 0,
      min: 0,
    },

    relatedLeadId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    relatedEventId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

VenueFileSchema.index({ venueId: 1, kind: 1, createdAt: -1 });
VenueFileSchema.index({ venueId: 1, relatedLeadId: 1 });

const VenueFile =
  models.VenueFile || model<VenueFileDocument>("VenueFile", VenueFileSchema);

export default VenueFile;
