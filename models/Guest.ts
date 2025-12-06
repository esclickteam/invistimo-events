import mongoose from "mongoose";

const GuestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    rsvp: { type: String, enum: ["yes", "no", "pending"], default: "pending" },
    guestsCount: { type: Number, default: 1 },
    notes: { type: String },
    invitationId: { type: mongoose.Schema.Types.ObjectId, ref: "Invitation" },
  },
  { timestamps: true }
);

export default mongoose.models.Guest || mongoose.model("Guest", GuestSchema);
