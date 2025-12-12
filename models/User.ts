import mongoose, { Schema, Document, models } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;

  // חבילה
  plan: "basic" | "premium";

  // הגבלות לפי חבילה
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

    // הגבלות (ברירת מחדל = בסיס)
    planLimits: {
      maxGuests: { type: Number, default: 50 }, // 👈 בסיס
      smsEnabled: { type: Boolean, default: false },
      seatingEnabled: { type: Boolean, default: false },
      remindersEnabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export default models.User || mongoose.model<IUser>("User", UserSchema);
