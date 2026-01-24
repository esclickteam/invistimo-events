// models/SupplierCategory.js
import mongoose from "mongoose";

const SupplierCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },        // צילום
  subs: [{ type: String }],                      // ["סטילס", "וידאו"]
  ownerId: { type: mongoose.Schema.Types.ObjectId }, // אופציונלי
}, { timestamps: true });

export default mongoose.models.SupplierCategory ||
  mongoose.model("SupplierCategory", SupplierCategorySchema);
