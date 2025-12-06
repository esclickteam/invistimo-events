import mongoose, { Schema, models, model } from "mongoose";

const InvitationSchema = new Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, required: true },

    canvasData: { type: Object, required: true }, // כל האובייקטים מהעורך
    previewImage: { type: String },               // תמונה להצגה מהירה

    shareId: { type: String, unique: true },      // קישור ציבורי להזמנה
  },
  { timestamps: true }
);

export default models.Invitation || model("Invitation", InvitationSchema);
