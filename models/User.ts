import mongoose, { Schema, Document, models } from "mongoose";

/* ============================================================
   TYPES
============================================================ */
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;

  // חבילה
  plan: "basic" | "premium";

  // רמת החבילה בפועל
  guests: number | null;     // null = ללא הגבלה
  paidAmount: number;

  // הגבלות לפי חבילה
  planLimits: {
    maxGuests: number | null; // null = UNLIMITED
    smsEnabled: boolean;
    seatingEnabled: boolean;
    remindersEnabled: boolean;
  };
}

/* ============================================================
   SCHEMA
============================================================ */
const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    /* ================== PLAN ================== */
    plan: {
      type: String,
      enum: ["basic", "premium"],
      default: "basic",
    },

    /* ================== PLAN LEVEL ================== */
    guests: {
      type: Number,
      default: null, // ⭐ Basic = ללא הגבלה
    },

    paidAmount: {
      type: Number,
      default: 49,
    },

    /* ================== LIMITS ================== */
    planLimits: {
      maxGuests: {
        type: Number,
        default: null, // ⭐ null = UNLIMITED
      },
      smsEnabled: {
        type: Boolean,
        default: true, // ⭐ פתוח בבייסיק
      },
      seatingEnabled: {
        type: Boolean,
        default: true,
      },
      remindersEnabled: {
        type: Boolean,
        default: true,
      },
    },
  },
  { timestamps: true }
);

/* ============================================================
   MODEL
============================================================ */
export default models.User || mongoose.model<IUser>("User", UserSchema);
