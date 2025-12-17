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
   AUTO LOGIC: לפני שמירה ראשונית (create / save)
============================================================ */
(UserSchema.pre as any)("save", function (this: IUser, next: any) {
  applyPlanRules(this);
  next();
});

/* ============================================================
   AUTO LOGIC: לפני עדכון (findOneAndUpdate)
   — כשמשתמש משדרג / משנה חבילה, נעדכן אוטומטית את ההגבלות
============================================================ */
(UserSchema.pre as any)("findOneAndUpdate", function (this: any, next: any) {
  const update = this.getUpdate();
  if (!update) return next();

  const plan = update.plan;
  const guests = update.guests;

  if (plan || guests) {
    // נוודא הגדרות תקינות לפי plan
    const level = safeLevel(guests);
    if (plan === "basic") {
      update.guests = 100;
      update.planLimits = {
        maxGuests: 100,
        smsEnabled: true,
        seatingEnabled: false,
        remindersEnabled: true,
      };
      update.paidAmount = 49;
    } else if (plan === "premium") {
      update.guests = level;
      update.planLimits = {
        maxGuests: level,
        smsEnabled: true,
        seatingEnabled: true,
        remindersEnabled: true,
      };
    }
    this.setUpdate(update);
  }

  next();
});

/* ============================================================
   MODEL
============================================================ */
export default models.User || mongoose.model<IUser>("User", UserSchema);
