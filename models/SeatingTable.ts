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
    id: {
      type: String,
      required: true, // מזהה פנימי לקנבס
    },
    name: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      default: "round",
    },
    seats: {
      type: Number,
      default: 0,
    },
    x: {
      type: Number,
      default: 0,
    },
    y: {
      type: Number,
      default: 0,
    },
    seatedGuests: {
      type: [SeatedGuestSchema],
      default: [],
    },
  },
  { _id: false }
);

/* ===============================
   ⭐ רקע אולם
=============================== */
const BackgroundSchema = new Schema(
  {
    url: {
      type: String, // ⭐ URL / base64 (בשלב זה)
      required: true,
    },
    opacity: {
      type: Number,
      default: 0.28,
      min: 0,
      max: 1,
    },
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
      unique: true, // ⭐ מסמך אחד לכל הזמנה
      index: true,
    },

    /** ⭐ רקע אולם */
    background: {
      type: BackgroundSchema,
      default: null,
    },

    /** ⭐ שולחנות */
    tables: {
      type: [TableSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: true, // ⭐ חשוב – מונע שדות זבל
  }
);

export default mongoose.models.SeatingTable ||
  mongoose.model("SeatingTable", SeatingTableSchema);
