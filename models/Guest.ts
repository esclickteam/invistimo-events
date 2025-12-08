import mongoose from "mongoose";

const GuestSchema = new mongoose.Schema(
  {
    invitationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
    },

    name: { type: String, required: true },
    phone: { type: String, required: true },

    // 🔵 מזהה אישי לכל אורח — חובה להפעלת קישור אישי
    shareId: {
      type: String,
      unique: true,
      required: true,
    },

    // 🟡 סטטוס RSVP שהאורח בוחר בקישור האישי שלו
    rsvp: {
      type: String,
      enum: ["yes", "no", "pending"],
      default: "pending",
    },

    // 🟢 כמה מגיעים — האורח יכול לשנות בקישור האישי
    guestsCount: { type: Number, default: 1 },

    // 📝 אופציונלי — הערה פנימית של בעל האירוע
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Guest ||
  mongoose.model("Guest", GuestSchema);
