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

    // 🟡 הסטטוס שהאורח בוחר בקישור שלו
    rsvp: {
      type: String,
      enum: ["yes", "no", "pending"],
      default: "pending",
    },

    // 🟢 מתעדכן אוטומטית מהממשק של האורח
    guestsCount: { type: Number, default: 1 },

    // 📝 אופציונלי
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Guest ||
  mongoose.model("Guest", GuestSchema);
