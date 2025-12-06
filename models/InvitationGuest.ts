import mongoose, { Schema, model, models } from "mongoose";

const InvitationGuestSchema = new Schema(
  {
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
    },

    name: { type: String, required: true },
    phone: { type: String, required: true },

    rsvp: { type: String, default: "pending" }, // yes | no | pending
    guestsCount: { type: Number, default: 1 },
    notes: { type: String, default: "" },

    token: { type: String, required: true }, // קישור ייחודי לאורח
  },
  { timestamps: true }
);

export default models.InvitationGuest ||
  model("InvitationGuest", InvitationGuestSchema);
