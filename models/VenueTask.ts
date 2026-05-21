import mongoose, { Schema, Types } from "mongoose";

export type VenueTaskPriority = "low" | "medium" | "high";

export type VenueTaskDocument = {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId | string;

  title: string;
  area: string;
  due: string;
  priority: VenueTaskPriority;
  done: boolean;

  createdAt: Date;
  updatedAt: Date;
};

const VenueTaskSchema = new Schema<VenueTaskDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    area: {
      type: String,
      default: "כללי",
      trim: true,
    },

    due: {
      type: String,
      default: "",
      trim: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    done: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

VenueTaskSchema.index({ ownerId: 1, done: 1, createdAt: -1 });

export default mongoose.models.VenueTask ||
  mongoose.model<VenueTaskDocument>("VenueTask", VenueTaskSchema);