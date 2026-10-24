import mongoose, { Schema, models, model } from "mongoose";

const InvitationStudioTemplateSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    source: { type: String, enum: ["catalog", "custom"], default: "catalog" },
    hidden: { type: Boolean, default: false },
    free: { type: Boolean, default: null },
    sort: { type: Number, default: null },
    name: { type: String, default: "" },
    category: { type: String, default: "" },
    style: { type: String, default: "" },
    description: { type: String, default: "" },
    template: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export default models.InvitationStudioTemplate ||
  model("InvitationStudioTemplate", InvitationStudioTemplateSchema);
