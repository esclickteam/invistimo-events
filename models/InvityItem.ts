import mongoose, { Schema, model, models } from "mongoose";

const InvityItemSchema = new Schema(
  {
    type: { type: String, required: true }, // background | element | shape | animation
    url: String,
    thumbnail: String,
    shapeData: Object,
    lottieData: Object,
  },
  { timestamps: true }
);

export default models.InvityItem || model("InvityItem", InvityItemSchema);
