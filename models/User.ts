import mongoose, { Schema, Document, models } from "mongoose";

/* ============================================================
   TYPES
============================================================ */
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;

  plan: "basic" | "premium";
  guests: number;
  paidAmount: number;

  planLimits: {
    maxGuests: number;
    smsEnabled: boolean;
    seatingEnabled: boolean;
    remindersEnabled: boolean;
  };
}

/* ============================================================
   HELPERS
============================================================ */
const ALLOWED_GUEST_LEVELS = [100, 200, 300, 400, 500, 600, 700, 800, 1000];

function safeLevel(value: any) {
  const n = Number(value);
  return ALLOWED_GUEST_LEVELS.includes(n) ? n : 100;
}

function applyPlanRules(user: IUser) {
  const level = safeLevel(user.guests);

  if (user.plan === "basic") {
    user.guests = 100;
    user.paidAmount = user.paidAmount || 49;
    user.planLimits = {
      maxGuests: 100,
      smsEnabled: true,
      seatingEnabled: false,
      remindersEnabled: true,
    };
  } else {
    user.guests = level;
    user.planLimits = {
      maxGuests: level,
      smsEnabled: true,
      seatingEnabled: true,
      remindersEnabled: true,
    };
  }
}

/* ============================================================
   SCHEMA
============================================================ */
const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },

    plan: { type: String, enum: ["basic", "premium"], default: "basic" },

    guests: { type: Number, default: 100 },

    paidAmount: { type: Number, default: 49 },

    planLimits: {
      maxGuests: { type: Number, default: 100 },
      smsEnabled: { type: Boolean, default: true },
      seatingEnabled: { type: Boolean, default: false },
      remindersEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

/* ============================================================
   AUTO LOGIC: לפני שמירה (create / save)
   ✅ בלי next בכלל (מונע את: e is not a function)
============================================================ */
UserSchema.pre("save", function () {
  applyPlanRules(this as unknown as IUser);
});

/* ============================================================
   AUTO LOGIC: לפני עדכון (findOneAndUpdate)
   ✅ בלי next בכלל
   ✅ תומך גם במבנה { $set: {...} }
============================================================ */
UserSchema.pre("findOneAndUpdate", function () {
  const rawUpdate = (this as any).getUpdate() || {};
  const isUsingSet = !!rawUpdate.$set;
  const update = isUsingSet ? rawUpdate.$set : rawUpdate;

  const plan = update.plan;
  const guests = update.guests;

  if (plan || guests) {
    const level = safeLevel(guests);

    if (plan === "basic") {
      update.plan = "basic";
      update.guests = 100;
      update.paidAmount = 49;
      update.planLimits = {
        maxGuests: 100,
        smsEnabled: true,
        seatingEnabled: false,
        remindersEnabled: true,
      };
    } else if (plan === "premium") {
      update.plan = "premium";
      update.guests = level;
      update.planLimits = {
        maxGuests: level,
        smsEnabled: true,
        seatingEnabled: true,
        remindersEnabled: true,
      };
    }

    if (isUsingSet) rawUpdate.$set = update;
    (this as any).setUpdate(rawUpdate);
  }
});

/* ============================================================
   MODEL
============================================================ */
export default models.User || mongoose.model<IUser>("User", UserSchema);
