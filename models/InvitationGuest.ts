import mongoose, { Schema, models } from "mongoose";

/* ===========================================================
   📌 InvitationGuest Schema
   כל אורח שמקבל הזמנה אישית עם token ייחודי
   שייך להזמנה אחת (Invitation)
=========================================================== */

const InvitationGuestSchema = new Schema(
  {
    /* ================= קשר להזמנה ================= */

    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
      index: true,
    },

    /* ================= פרטי אורח ================= */

    name: { type: String, required: true },
    phone: { type: String, required: true },

    relation: { type: String, default: "" },

    notes: { type: String, default: "" },

    /* ================= RSVP ================= */

    rsvp: {
      type: String,
      enum: ["yes", "no", "pending"],
      default: "pending",
    },

    // כמה הוזמנו
    guestsCount: {
      type: Number,
      default: 1,
      min: 1,
    },

    // ✅ כמה הגיעו בפועל (ידני – אדמין / בעל הזמנה)
    arrivedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* ================= טוקן אישי ================= */

    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /* ================= 🪑 הושבה ================= */

    // מספר שולחן (לתצוגה / הודעות)
    tableNumber: {
      type: Number,
      default: null,
    },

    // שם שולחן (מחושב מהושבה)
    tableName: {
      type: String,
      default: "",
    },

    // קישור לשולחן בקנבס
    tableId: {
      type: Schema.Types.ObjectId,
      ref: "SeatingTable",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* ===========================================================
   ⚠️ חובה ב-Next.js (prevent model overwrite)
=========================================================== */

export default models.InvitationGuest ||
  mongoose.model("InvitationGuest", InvitationGuestSchema);
