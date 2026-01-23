import mongoose, { Schema, models } from "mongoose";

/* ===========================================================
   Helpers
=========================================================== */
function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/* ===========================================================
   📌 InvitationGuest Schema
   🔥 מקור אמת יחיד לכל המערכת
=========================================================== */
const InvitationGuestSchema = new Schema(
  {
    /* ===============================
       🔗 שיוך להזמנה (חובה)
    =============================== */
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
      index: true,
    },

    /* ===============================
       👤 פרטי מוזמן
    =============================== */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      default: null,
      trim: true,
    },

    relation: {
      type: String,
      default: "",
      trim: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    /* ===============================
       ⭐ קבוצות (מבוסס invitationId)
    =============================== */
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      default: null,
      index: true,
    },

    /* ===============================
       📬 סטטוס הגעה
    =============================== */
    rsvp: {
      type: String,
      enum: ["yes", "no", "pending"],
      default: "pending",
      index: true,
    },

    // כמה הוזמנו (יכול להיות 0)
    guestsCount: {
      type: Number,
      default: 1,
      min: 0,
      set: (v: unknown) => toNumber(v, 0),
    },

    // כמה הגיעו בפועל (LIVE)
    arrivedCount: {
      type: Number,
      default: 0,
      min: 0,
      set: (v: unknown) => toNumber(v, 0),
    },

    /* ===============================
       🔐 טוקן אישי (לא גלובלי!)
    =============================== */
    token: {
      type: String,
      required: true,
      trim: true,
    },

    /* ===============================
       🪑 הושבה
    =============================== */
    tableId: {
      type: Schema.Types.ObjectId,
      ref: "SeatingTable",
      default: null,
    },

    tableNumber: {
      type: Number,
      default: null,
    },

    tableName: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ===========================================================
   Indexes (חשוב!)
=========================================================== */

// ❗ טוקן חייב להיות ייחודי *רק בתוך הזמנה*
InvitationGuestSchema.index(
  { invitationId: 1, token: 1 },
  { unique: true }
);

// שאילתות נפוצות
InvitationGuestSchema.index({ invitationId: 1, groupId: 1 });
InvitationGuestSchema.index({ invitationId: 1, rsvp: 1 });

/* ===========================================================
   Export
=========================================================== */
export default models.InvitationGuest ||
  mongoose.model("InvitationGuest", InvitationGuestSchema);
