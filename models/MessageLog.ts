import mongoose from "mongoose";

const MessageLogSchema = new mongoose.Schema({
  invitationId: { type: mongoose.Schema.Types.ObjectId, required: true },
  guestId: { type: mongoose.Schema.Types.ObjectId, required: true },
  phone: String,
  message: String,
  type: { type: String, enum: ["rsvp", "table", "custom"] },
  status: { type: String, enum: ["sent", "failed"], default: "sent" },
  sentAt: { type: Date, default: Date.now },
});

export default mongoose.models.MessageLog ||
  mongoose.model("MessageLog", MessageLogSchema);
