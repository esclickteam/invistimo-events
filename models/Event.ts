import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    eventType: { type: String, default: "אירוע" }, // סוג האירוע
    title: { type: String, default: "" }, // שם האירוע
    date: { type: String, default: "" },
    location: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.models.Event ||
  mongoose.model("Event", EventSchema);
