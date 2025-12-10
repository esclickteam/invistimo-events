import mongoose, { Schema } from "mongoose";

const SeatedGuestSchema = new Schema({
  guestId: { type: String, required: true },
  seatIndex: { type: Number, required: true },
});

const TableSchema = new Schema({
  id: String,
  name: String,
  type: String,
  seats: Number,
  x: Number,
  y: Number,
  seatedGuests: [SeatedGuestSchema],
});

const SeatingTableSchema = new Schema(
  {
    invitationId: { type: Schema.Types.ObjectId, ref: "Invitation", required: true },
    tables: [TableSchema],
  },
  { timestamps: true }
);

export default mongoose.models.SeatingTable ||
  mongoose.model("SeatingTable", SeatingTableSchema);
