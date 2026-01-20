import mongoose, { Schema, Types } from "mongoose";

/* ============================================================
   Group Schema
============================================================ */
const GroupSchema = new Schema(
  {
    invitationId: {
      type: Types.ObjectId,
      ref: "Invitation",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    color: {
      type: String,
      default: null,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

/* ============================================================
   Indexes
============================================================ */
// מונע כפילויות שם קבוצה לאותה הזמנה
GroupSchema.index(
  { invitationId: 1, name: 1 },
  { unique: true }
);

/* ============================================================
   Model Export (Next.js safe)
============================================================ */
const Group =
  mongoose.models.Group || mongoose.model("Group", GroupSchema);

export default Group;
