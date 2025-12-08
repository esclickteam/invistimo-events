import mongoose, { Schema, models } from "mongoose";

/* ===========================================================
   📌 InvitationGuest Schema
   כל אורח שמקבל הזמנה אישית עם token ייחודי
   שייך להזמנה אחת (Invitation)
=========================================================== */

const InvitationGuestSchema = new Schema(
  {
    // ID של ההזמנה שהאורח שייך אליה
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
    },

    // פרטי האורח
    name: { type: String, required: true },
    phone: { type: String, required: true },

    // RSVP - בחירת האורח בקישור האישי
    rsvp: {
      type: String,
      enum: ["yes", "no", "pending"],
      default: "pending",
    },

    // כמה מוזמנים הוא מביא
    guestsCount: { type: Number, default: 1 },

    // הערות של בעל האירוע
    notes: { type: String, default: "" },

    // טוקן ייחודי לקישור אישי (example: /invite/rsvp/:token)
    token: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

/* ===========================================================
   ⚠️ חובה ב-NEXT.JS
   שימוש ב-models כדי למנוע שגיאה של
   OverwriteModelError כשקבצים נטענים פעמיים
=========================================================== */

export default models.InvitationGuest ||
  mongoose.model("InvitationGuest", InvitationGuestSchema);
