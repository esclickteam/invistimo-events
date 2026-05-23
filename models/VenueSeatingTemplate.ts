import mongoose, { Schema, Types } from "mongoose";

export type VenueSeatingTemplateDocument = {
  _id: Types.ObjectId;

  ownerId: Types.ObjectId | string;

  hallId: string;
  hallName?: string;

  name: string;
  description?: string;

  tables: any[];
  canvas?: any;
  settings?: any;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
};

const VenueSeatingTemplateSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    hallId: {
      type: String,
      required: true,
      index: true,
    },

    hallName: {
      type: String,
      default: "",
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    tables: {
      type: Array,
      default: [],
    },

    canvas: {
      type: Schema.Types.Mixed,
      default: {},
    },

    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

VenueSeatingTemplateSchema.index({
  ownerId: 1,
  hallId: 1,
  createdAt: -1,
});

const VenueSeatingTemplate =
  mongoose.models.VenueSeatingTemplate ||
  mongoose.model("VenueSeatingTemplate", VenueSeatingTemplateSchema);

export default VenueSeatingTemplate;