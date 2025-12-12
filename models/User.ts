import mongoose, { Schema, Document, models } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;

  // חבילה
  plan: "basic" | "premium";

  // רמת החבילה בפועל
  guests: number;        // 50 / 100 / 300 / 500 / 1000
  paidAmount: number;    // כמה כסף שולם עד כה

  // הגבלות לפי חבילה (נגזר)
  planLimits: {
    maxGuests: number;
    smsEnabled: boolean;
    seatingEnabled: boolean;
    remindersEnabled: boolean;
  };
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // חבילה
    plan: {
      type: String,
      enum: ["basic", "premium"],
      default: "basic",
    },

    // ⭐ רמת חבילה בפועל
    guests: {
      type: Number,
      default: 50, // בסיס
    },

    // ⭐ כמה שולם בפועל
    paidAmount: {
      type: Number,
      default: 49, // בסיס
    },

    // הגבלות (נגזרות מהחבילה)
    planLimits: {
      maxGuests: { type: Number, default: 50 },
      smsEnabled: { type: Boolean, default: false },
      seatingEnabled: { type: Boolean, default: false },
      remindersEnabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export default models.User || mongoose.model<IUser>("User", UserSchema);
