import mongoose, { Schema, models } from "mongoose";

/**
 * One claim per normalized phone inside an event.
 * Existing duplicate guests are left in place. Only the first one owns the claim,
 * so a unique index can be created without deleting or merging current records.
 */
const GuestPhoneClaimSchema = new Schema(
  {
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
    },
    phoneNormalized: {
      type: String,
      required: true,
      trim: true,
    },
    guestId: {
      type: Schema.Types.ObjectId,
      ref: "InvitationGuest",
      required: true,
    },
  },
  { timestamps: true }
);

GuestPhoneClaimSchema.index(
  { invitationId: 1, phoneNormalized: 1 },
  { unique: true, name: "invitation_phone_claim_unique" }
);

const GuestPhoneClaim =
  models.GuestPhoneClaim ||
  mongoose.model("GuestPhoneClaim", GuestPhoneClaimSchema);

export default GuestPhoneClaim;
