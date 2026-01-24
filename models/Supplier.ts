// models/Supplier.js
import mongoose from "mongoose";

const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  link: String,
  basePrice: Number,

  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SupplierCategory",
    required: true,
  },
  sub: { type: String, required: true },

  ownerId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

export default mongoose.models.Supplier ||
  mongoose.model("Supplier", SupplierSchema);
