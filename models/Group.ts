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

    /* ✅ NEW: כמות אנשים כוללת בקבוצה (לא תלוי בכמות invitationGuests) */
    expectedCount: {
      type: Number,
      default: 0,
      min: 0,
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

// 🟡 אינדקס ישן – אפשר להשאיר זמנית אם יש דאטה קיים
// GroupSchema.index({ invitationId: 1, name: 1 });

/* ============================================================
   Model Export (Next.js safe)
============================================================ */
const Group = mongoose.models.Group || mongoose.model("Group", GroupSchema);

export default Group;
