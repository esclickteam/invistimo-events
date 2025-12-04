import mongoose from "mongoose";

const GuestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    rsvp: { type: String, default: "pending" }, // yes / no / pending
  },
  { timestamps: true }
);

export default mongoose.models.Guest || mongoose.model("Guest", GuestSchema);
