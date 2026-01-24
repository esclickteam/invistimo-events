// models/EventSupplier.js
import mongoose from "mongoose";

const EventSupplierSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, required: true },

  category: String,
  sub: String,

  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
  },

  price: Number,
  advance: Number,
  balance: Number,

  files: [String],
}, { timestamps: true });

export default mongoose.models.EventSupplier ||
  mongoose.model("EventSupplier", EventSupplierSchema);
