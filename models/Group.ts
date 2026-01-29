import mongoose, { Schema, Types } from "mongoose";

/* ============================================================
   Group Schema (EVENT = Source of Truth)
============================================================ */
const GroupSchema = new Schema(
  {
    /* ✅ מקור אמת */
    eventId: {
      type: Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    /* 🟡 Legacy – לא להשתמש יותר בלוגיקה */
    invitationId: {
      type: Types.ObjectId,
      ref: "Invitation",
      index: true,
      default: null,
    },

    /* ✅ שם הקבוצה */
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

    /* ✅ כמות אנשים כוללת בקבוצה */
    expectedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* ⭐️⭐️⭐️ קריטי – שיוך קבוצה לשולחן */
    tableId: {
      type: String, // UUID של השולחן (לא ObjectId!)
      default: null,
      index: true,
    },

    /* ⭐️ סטטוס הושבה (אופציונלי אבל מומלץ) */
    isSeated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/* ============================================================
   Indexes
============================================================ */
// ✅ מונע כפילויות שם קבוצה לאותו אירוע
GroupSchema.index({ eventId: 1, name: 1 }, { unique: true });

/* ============================================================
   Model Export (Next.js safe)
============================================================ */
const Group =
  mongoose.models.Group || mongoose.model("Group", GroupSchema);

export default Group;
