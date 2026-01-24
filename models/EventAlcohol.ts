import mongoose from "mongoose";

const AllocationSchema = new mongoose.Schema(
  {
    location: { type: String, required: true }, // בר / מחסן / שולחן
    qty: { type: Number, required: true },
    opened: { type: Number, default: 0 },
  },
  { _id: true }
);

const EventAlcoholSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    category: { type: String, required: true }, // וודקה / וויסקי
    brand: { type: String, required: true },    // Absolut
    flavor: { type: String },                   // וניל / טבעי
    total: { type: Number, required: true },    // סה"כ בקבוקים

    allocations: [AllocationSchema],
  },
  { timestamps: true }
);

export default mongoose.models.EventAlcohol ||
  mongoose.model("EventAlcohol", EventAlcoholSchema);
