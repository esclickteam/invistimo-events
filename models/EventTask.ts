import mongoose, { Schema, Document, Model } from "mongoose";

/* =========================
   TYPES
========================= */
export type TaskStatus = "open" | "waiting" | "done";

export interface IEventTask extends Document {
  /* קשרים */
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  producerId?: mongoose.Types.ObjectId;

  /* תוכן */
  title: string;
  dueDate: string; // yyyy-mm-dd
  status: TaskStatus;

  /* סדר / מערכת */
  order: number;
  archived: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/* =========================
   SCHEMA
========================= */
const EventTaskSchema = new Schema<IEventTask>(
  {
    /* =========================
       קשר לאירוע
    ========================= */
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    /* =========================
       בעלות (לקוח)
    ========================= */
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* =========================
       מפיק (אופציונלי)
    ========================= */
    producerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: undefined, // ❌ לא null
      index: true,
    },

    /* =========================
       תוכן המשימה
    ========================= */
    title: {
      type: String,
      required: true,
      trim: true,
    },

    /* =========================
       תאריך יעד
    ========================= */
    dueDate: {
      type: String, // yyyy-mm-dd
      default: "",
    },

    /* =========================
       סטטוס
    ========================= */
    status: {
      type: String,
      enum: ["open", "waiting", "done"],
      default: "open",
      index: true,
    },

    /* =========================
       סדר ידני (Drag & Drop עתידי)
    ========================= */
    order: {
      type: Number,
      default: 0,
    },

    /* =========================
       מערכת
    ========================= */
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================================================
   ❌ אין אינדקסים בקוד
   ✔️ מנוהלים ידנית ב־MongoDB
========================================================= */

const EventTask: Model<IEventTask> =
  mongoose.models.EventTask ||
  mongoose.model<IEventTask>("EventTask", EventTaskSchema);

export default EventTask;
