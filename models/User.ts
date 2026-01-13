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

  hasPaid: boolean;

  createdByProducer?: mongoose.Types.ObjectId | null;

  includeCalls: boolean;
  callsAddonPrice: number;

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

  isTrial: boolean;
  trialStartedAt?: Date;
  trialExpiresAt?: Date;
  isDemoUser?: boolean;

  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  createdAt: Date;
  updatedAt: Date;

  // 🧠 VIRTUAL
  remainingSms?: number;
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
   PLAN RULES
============================================================ */
function applyPlanRules(user: IUser) {
  // 🧪 TRIAL
  if (user.isTrial) {
    user.plan = "premium";
    user.guests = 1000;
    user.paidAmount = 0;
    user.hasPaid = false;

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

  const callsAddon = user.includeCalls ? level * 1 : 0;

  if (user.plan === "basic") {
    user.plan = "basic";
    user.guests = 100;
    user.paidAmount = 49;
    user.hasPaid = true;

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
    user.paidAmount = (basePrices[level] ?? 149) + callsAddon;
    user.hasPaid = user.paidAmount > 0;

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

    hasPaid: { type: Boolean, default: false, index: true },

    createdByProducer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    includeCalls: { type: Boolean, default: false },
    callsAddonPrice: { type: Number, default: 0 },

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

    isTrial: { type: Boolean, default: false },
    trialStartedAt: Date,
    trialExpiresAt: Date,
    isDemoUser: { type: Boolean, default: false },

    resetPasswordToken: { type: String, index: true },
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ============================================================
   🔥 VIRTUAL – remainingSms (SOURCE OF TRUTH FOR UI)
============================================================ */
UserSchema.virtual("remainingSms").get(function (this: IUser) {
  if (!this.planLimits?.smsEnabled) return 0;

  if (this.planLimits.smsLimit === Infinity) {
    return Infinity;
  }

  const used = this.smsUsed ?? 0;
  const limit = this.planLimits.smsLimit ?? 0;

  return Math.max(limit - used, 0);
});

/* ============================================================
   AUTO LOGIC – SAVE
============================================================ */
UserSchema.pre("save", function () {
  applyPlanRules(this as IUser);
});

/* ============================================================
   AUTO LOGIC – FIND ONE AND UPDATE
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
    update.hasPaid = false;

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
      update.hasPaid = true;

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
      update.hasPaid = update.paidAmount > 0;

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
