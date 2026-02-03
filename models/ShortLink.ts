import mongoose from "mongoose";

const ShortLinkSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  targetUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }, // אופציונלי
});

export default mongoose.models.ShortLink ||
  mongoose.model("ShortLink", ShortLinkSchema);
