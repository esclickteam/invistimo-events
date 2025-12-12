import mongoose, { Schema } from "mongoose";

/* ===============================
   אורח יושב
=============================== */
const SeatedGuestSchema = new Schema(
  {
    guestId: {
      type: Schema.Types.ObjectId,
      ref: "InvitationGuest",
      required: true,
    },
    seatIndex: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

/* ===============================
   שולחן
=============================== */
const TableSchema = new Schema(
  {
    id: { type: String, required: true }, // מזהה פנימי לקנבס
    name: String,
    type: String,
    seats: Number,
    x: Number,
    y: Number,
    seatedGuests: [SeatedGuestSchema],
  },
  { _id: false }
);

/* ===============================
   סידור הושבה (מסמך אחד להזמנה)
=============================== */
const SeatingTableSchema = new Schema(
  {
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
      unique: true, // ⭐ קריטי – מונע כפילויות
      index: true,
    },
    tables: [TableSchema],
  },
  { timestamps: true }
);

export default mongoose.models.SeatingTable ||
  mongoose.model("SeatingTable", SeatingTableSchema);
