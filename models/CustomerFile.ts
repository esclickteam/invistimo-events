import mongoose, { Schema, model, models } from "mongoose";

const CustomerFileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    invitationId: { type: Schema.Types.ObjectId, ref: "Invitation", index: true },

    fullName: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },

    eventDate: { type: Date },
    venueName: { type: String, default: "" },
    city: { type: String, default: "" },

    packageName: { type: String, default: "" },
    packageBasePrice: { type: Number, default: 0 },
    packageTargetPriceWithCalls: { type: Number, default: 0 },

    hasCallRounds: { type: Boolean, default: false },
    allowedCallRounds: { type: Number, default: 0 },

    totalPrice: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["lead", "quote_sent", "paid", "active", "completed", "cancelled"],
      default: "lead",
      index: true,
    },

    assignedStaffIds: [{ type: Schema.Types.ObjectId, ref: "User" }],

    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default models.CustomerFile || model("CustomerFile", CustomerFileSchema);