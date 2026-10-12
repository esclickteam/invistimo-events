import mongoose, { Schema } from "mongoose";

const KosherPhonePrefixSchema = new Schema(
  {
    prefix: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    carrier: {
      type: String,
      required: true,
      trim: true,
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.KosherPhonePrefix ||
  mongoose.model("KosherPhonePrefix", KosherPhonePrefixSchema);
