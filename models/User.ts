import mongoose, { Schema, Document, models } from "mongoose";

/* ============================================================
   TYPES
============================================================ */
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;

  role: "user" | "producer" | "photographer" | "admin";

  plan: "basic" | "premium";
  guests: number;
  paidAmount: number;

  // ✅ מי יצר את הלקוח (אם נוצר ע"י מפיק)
  createdByProducer?: mongoose.Types.ObjectId | null;

  // ☎️ שירות שיחות
  includeCalls: boolean;
  callsAddonPrice: number;

  // 🎁 מתנות באשראי
  includeCreditGifts: boolean;
  creditGiftsAddonPrice: number;

  planLimits: {
    maxGuests: number;
    smsEnabled: boolean;
    smsLimit: number;
    seatingEnabled: boolean;
    remindersEnabled: boolean;
  };

  smsUsed: number;

  // 🧪 TRIAL / DEMO
  isTrial: boolean;
  trialStartedAt?: Date;
  trialExpiresAt?: Date;
  isDemoUser?: boolean;

  // 🔐 RESET PASSWORD
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/* ============================================================
   HELPERS
============================================================ */
const ALLOWED_GUEST_LEVELS = [100, 200, 300, 400, 500, 600, 700, 800, 1000];

function safeLevel(value: any) {
  const n = Number(value);
  return ALLOWED_GUEST_LEVELS.includes(n) ? n : 100;
}

/* ============================================================
   חישוב כללי לפי חבילה
   ⚠️ מתנות באשראי אינן משפיעות על חישוב מחיר כאן
============================================================ */
function applyPlanRules(user: IUser) {
  // 🧪 TRIAL
  if (user.isTrial) {
    user.plan = "premium";
    user.guests = 1000;
    user.paidAmount = 0;

    user.includeCalls = false;
    user.callsAddonPrice = 0;

    user.includeCreditGifts = false;
    user.creditGiftsAddonPrice = 0;

    user.planLimits = {
      maxGuests: 1000,
      smsEnabled: true,
      smsLimit: 10,
      seatingEnabled: true,
      remindersEnabled: true,
    };

    user.smsUsed = user.smsUsed ?? 0;
    return;
  }

  const level = safeLevel(user.guests);

  const basePrices: Record<number, number> = {
    100: 149,
    200: 239,
    300: 299,
    400: 379,
    500: 429,
    600: 489,
    700: 539,
    800: 599,
    1000: 699,
  };

  // ☎️ תוספת שיחות – שקל לאורח
  const callsAddon = user.includeCalls ? level * 1 : 0;

  if (user.plan === "basic") {
    user.plan = "basic";
    user.guests = 100;
    user.paidAmount = 49;

    user.includeCalls = false;
    user.callsAddonPrice = 0;

    user.includeCreditGifts = false;
    user.creditGiftsAddonPrice = 0;

    user.planLimits = {
      maxGuests: 100,
      smsEnabled: true,
      smsLimit: 100,
      seatingEnabled: false,
      remindersEnabled: true,
    };
  } else {
    user.plan = "premium";
    user.guests = level;

    user.callsAddonPrice = callsAddon;

    // ⚠️ כאן לא מוסיפים מתנות באשראי למחיר
    user.paidAmount = (basePrices[level] ?? 149) + callsAddon;

    user.planLimits = {
      maxGuests: level,
      smsEnabled: true,
      smsLimit: Infinity as any,
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

    role: {
      type: String,
      enum: ["user", "producer", "photographer", "admin"],
      default: "user",
    },

    plan: {
      type: String,
      enum: ["basic", "premium"],
      default: "basic",
    },

    guests: { type: Number, default: 100 },
    paidAmount: { type: Number, default: 49 },

    // ✅ קישור למפיק שיצר את הלקוח
    createdByProducer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // ☎️ שירות שיחות
    includeCalls: { type: Boolean, default: false },
    callsAddonPrice: { type: Number, default: 0 },

    // 🎁 מתנות באשראי
    includeCreditGifts: { type: Boolean, default: false },
    creditGiftsAddonPrice: { type: Number, default: 0 },

    planLimits: {
      maxGuests: { type: Number, default: 100 },
      smsEnabled: { type: Boolean, default: true },
      smsLimit: { type: Number, default: 100 },
      seatingEnabled: { type: Boolean, default: false },
      remindersEnabled: { type: Boolean, default: true },
    },

    smsUsed: { type: Number, default: 0 },

    // 🧪 TRIAL / DEMO
    isTrial: { type: Boolean, default: false },
    trialStartedAt: Date,
    trialExpiresAt: Date,
    isDemoUser: { type: Boolean, default: false },

    // 🔐 RESET PASSWORD
    resetPasswordToken: { type: String, index: true },
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

/* ============================================================
   AUTO LOGIC: לפני save
============================================================ */
UserSchema.pre("save", function () {
  applyPlanRules(this as IUser);
});

/* ============================================================
   AUTO LOGIC: לפני findOneAndUpdate
============================================================ */
UserSchema.pre("findOneAndUpdate", function () {
  const rawUpdate = (this as any).getUpdate() || {};
  const isUsingSet = !!rawUpdate.$set;
  const update = isUsingSet ? rawUpdate.$set : rawUpdate;

  const plan = update.plan;
  const guests = update.guests;
  const includeCalls = !!update.includeCalls;
  const includeCreditGifts = !!update.includeCreditGifts;

  if (update.isTrial === true) {
    update.plan = "premium";
    update.guests = 1000;
    update.paidAmount = 0;

    update.includeCalls = false;
    update.callsAddonPrice = 0;

    update.includeCreditGifts = false;
    update.creditGiftsAddonPrice = 0;

    update.planLimits = {
      maxGuests: 1000,
      smsEnabled: true,
      smsLimit: 10,
      seatingEnabled: true,
      remindersEnabled: true,
    };

    update.smsUsed = update.smsUsed ?? 0;
  } else if (
    plan ||
    guests ||
    update.includeCalls !== undefined ||
    update.includeCreditGifts !== undefined
  ) {
    const level = safeLevel(guests);

    const basePrices: Record<number, number> = {
      100: 149,
      200: 239,
      300: 299,
      400: 379,
      500: 429,
      600: 489,
      700: 539,
      800: 599,
      1000: 699,
    };

    const callsAddon = includeCalls ? level * 1 : 0;

    if (plan === "basic") {
      update.plan = "basic";
      update.guests = 100;
      update.paidAmount = 49;

      update.includeCalls = false;
      update.callsAddonPrice = 0;

      update.includeCreditGifts = false;
      update.creditGiftsAddonPrice = 0;

      update.planLimits = {
        maxGuests: 100,
        smsEnabled: true,
        smsLimit: 100,
        seatingEnabled: false,
        remindersEnabled: true,
      };
    } else if (plan === "premium") {
      update.plan = "premium";
      update.guests = level;

      update.includeCalls = includeCalls;
      update.callsAddonPrice = callsAddon;

      update.includeCreditGifts = includeCreditGifts;
      update.creditGiftsAddonPrice =
        includeCreditGifts ? update.creditGiftsAddonPrice || 150 : 0;

      update.paidAmount = (basePrices[level] ?? 149) + callsAddon;

      update.planLimits = {
        maxGuests: level,
        smsEnabled: true,
        smsLimit: Infinity as any,
        seatingEnabled: true,
        remindersEnabled: true,
      };
    }
  }

  if (isUsingSet) rawUpdate.$set = update;
  (this as any).setUpdate(rawUpdate);
});

/* ============================================================
   MODEL
============================================================ */
export default models.User || mongoose.model<IUser>("User", UserSchema);
