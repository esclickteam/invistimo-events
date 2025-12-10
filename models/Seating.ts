import mongoose, { Schema, Document, Model } from "mongoose";

/* ============================================================
   TYPES
============================================================ */
export interface SeatingTable {
  id: string;
  name: string;
  type: string; // round | square | rect
  seats: number;
  x: number;
  y: number;
  seatedGuests: string[]; // ids של מוזמנים
}

export interface SeatingDocument extends Document {
  invitationId: mongoose.Types.ObjectId;
  tables: SeatingTable[];
  createdAt: Date;
  updatedAt: Date;
}

/* ============================================================
   SCHEMA
============================================================ */
const SeatingTableSchema = new Schema<SeatingTable>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  seats: { type: Number, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  seatedGuests: { type: [String], default: [] },
});

const SeatingSchema = new Schema<SeatingDocument>(
  {
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
    },

    tables: {
      type: [SeatingTableSchema],
      default: [],
    },
  },
  { timestamps: true }
);

/* ============================================================
   EXPORT
============================================================ */
export default (mongoose.models.Seating as Model<SeatingDocument>) ||
  mongoose.model<SeatingDocument>("Seating", SeatingSchema);
