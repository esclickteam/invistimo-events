import mongoose, { Schema, models } from "mongoose";

/* ===========================================================
   Helpers
=========================================================== */
function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/* ===========================================================
   📌 InvitationGuest Schema
=========================================================== */
const InvitationGuestSchema = new Schema(
  {
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
      index: true,
    },

    name: { type: String, required: true },

    phone: {
      type: String,
      default: null,
    },

    relation: { type: String, default: "" },
    notes: { type: String, default: "" },

    /* ===============================
       ⭐ שיוך לקבוצה
    =============================== */
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      default: null,
      index: true,
    },

    rsvp: {
      type: String,
      enum: ["yes", "no", "pending"],
      default: "pending",
    },

    // ✅ כמה הוזמנו (מאפשר גם 0 כשלא מגיעים)
    guestsCount: {
      type: Number,
      default: 1,
      min: 0,
      set: (v: unknown) => toNumber(v, 0),
    },

    // ✅ כמה הגיעו בפועל
    arrivedCount: {
      type: Number,
      default: 0,
      min: 0,
      set: (v: unknown) => toNumber(v, 0),
    },

    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    tableNumber: { type: Number, default: null },
    tableName: { type: String, default: "" },

    tableId: {
      type: Schema.Types.ObjectId,
      ref: "SeatingTable",
      default: null,
    },
  },
  { timestamps: true }
);

/* ===========================================================
   🔹 Static helper to increment/decrement arrivedCount
=========================================================== */
InvitationGuestSchema.statics.updateArrived = async function (
  guestId: string,
  increment: number
) {
  const guest = await this.findById(guestId);
  if (!guest) throw new Error("Guest not found");

  guest.arrivedCount = Math.max(0, (guest.arrivedCount || 0) + increment);
  await guest.save();

  return guest.arrivedCount;
};

export default models.InvitationGuest ||
  mongoose.model("InvitationGuest", InvitationGuestSchema);
