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

    /* ================= RSVP ================= */

    rsvp: {
      type: String,
      enum: ["yes", "no", "pending"],
      default: "pending",
    },

    guestsCount: { type: Number, default: 1 },

    notes: { type: String, default: "" },

    /* ================= טוקן אישי ================= */

    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /* ================= 🪑 הושבה ================= */

    // מספר שולחן (ל־SMS / WhatsApp / תצוגה)
    tableNumber: {
      type: Number,
      default: null,
    },

    // שם שולחן (אם בעתיד יהיו אזורים / שמות)
    tableName: {
      type: String,
      default: "",
    },

    // קישור לשולחן בקנבס (לא חובה)
    tableId: {
      type: Schema.Types.ObjectId,
      ref: "SeatingTable",
      default: null,
    },
  },
  { timestamps: true }
);

/* ===========================================================
   ⚠️ חובה ב-NEXT.JS
=========================================================== */

export default models.InvitationGuest ||
  mongoose.model("InvitationGuest", InvitationGuestSchema);
