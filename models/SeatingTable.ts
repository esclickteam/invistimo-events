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
   שולחן (⭐ snapshot ויזואלי מלא)
=============================== */
const TableSchema = new Schema(
  {
    /* מזהה פנימי לקנבס */
    id: {
      type: String,
      required: true,
    },

    /* מידע כללי */
    name: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      default: "round", // round / rect / long וכו'
    },

    /* כמות מושבים */
    seats: {
      type: Number,
      default: 0,
    },

    /* מיקום בקנבס */
    x: {
      type: Number,
      default: 0,
    },
    y: {
      type: Number,
      default: 0,
    },

    /* סיבוב */
    rotation: {
      type: Number,
      default: 0,
    },

    /* ⭐ גדלים – קריטי ל־1:1 */
    width: {
      type: Number,
      default: 120,
    },
    height: {
      type: Number,
      default: 120,
    },
    radius: {
      type: Number,
      default: 60,
    },

    /* ⭐ ויזואל */
    color: {
      type: String,
      default: "#ffffff",
    },
    locked: {
      type: Boolean,
      default: false,
    },

    /* אורחים יושבים */
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
      type: String,
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
      required: true,
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
   ⭐ סידור הושבה (מסמך אחד לאירוע)
=============================== */
const SeatingTableSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true, // ⭐ מסמך אחד לכל אירוע
      index: true,
    },

    /* ⭐ רקע אולם */
    background: {
      type: BackgroundSchema,
      default: null,
    },

    /* ⭐ שולחנות – snapshot מלא */
    tables: {
      type: [TableSchema],
      default: [],
    },

    /* ⭐ אזורים */
    zones: {
      type: [ZoneSchema],
      default: [],
    },

    /* ⭐ תצוגת קנבס */
    canvasView: {
      type: CanvasViewSchema,
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

export default mongoose.models.SeatingTable ||
  mongoose.model("SeatingTable", SeatingTableSchema);
