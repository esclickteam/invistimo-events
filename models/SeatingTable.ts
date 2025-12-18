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
    rotation: {
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
      type: String, // URL / base64
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
   ⭐ אזור (Zone)
=============================== */
const ZoneSchema = new Schema(
  {
    id: {
      type: String,
      required: true, // מזהה פנימי לקנבס
    },
    type: {
      type: String,
      required: true, // stage / bar / chuppah וכו'
    },

    name: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "#e5e7eb",
    },
    opacity: {
      type: Number,
      default: 0.35,
      min: 0,
      max: 1,
    },

    x: {
      type: Number,
      default: 0,
    },
    y: {
      type: Number,
      default: 0,
    },
    width: {
      type: Number,
      default: 100,
    },
    height: {
      type: Number,
      default: 100,
    },
    rotation: {
      type: Number,
      default: 0,
    },

    locked: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

/* ===============================
   ⭐ תצוגת קנבס (ZOOM + PAN)
=============================== */
const CanvasViewSchema = new Schema(
  {
    scale: {
      type: Number,
      default: 1,
    },
    x: {
      type: Number,
      default: 0,
    },
    y: {
      type: Number,
      default: 0,
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

    /** ⭐ אזורים (Zones) */
    zones: {
      type: [ZoneSchema],
      default: [],
    },

    /** ⭐ תצוגת קנבס */
    canvasView: {
      type: CanvasViewSchema,
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true, // ⭐ עכשיו בטוח – canvasView מוגדר
  }
);

export default mongoose.models.SeatingTable ||
  mongoose.model("SeatingTable", SeatingTableSchema);
