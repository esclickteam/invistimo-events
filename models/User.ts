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
    smsLimit: number; // 🧪 Trial only
    seatingEnabled: boolean;
    remindersEnabled: boolean;
  };

  // 🔥 SMS – USER SOURCE OF TRUTH
  maxMessages: number;
  remainingMessages: number;
  smsUsed: number;

  isTrial: boolean;
  trialStartedAt?: Date;
  trialExpiresAt?: Date;
  isDemoUser?: boolean;

  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/* ============================================================
   HELPERS
============================================================ */
const ALLOWED_GUEST_LEVELS = [
  100, 200, 300, 400, 500, 600, 700, 800, 1000,
];

function safeLevel(value: any) {
  const n = Number(value);
  return ALLOWED_GUEST_LEVELS.includes(n) ? n : 100;
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
    paidAmount: { type: Number, default: 0 },

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
      smsLimit: { type: Number, default: 0 }, // 🧪 trial only
      seatingEnabled: { type: Boolean, default: false },
      remindersEnabled: { type: Boolean, default: true },
    },

    // 🔥 SMS FIELDS
    maxMessages: { type: Number, default: 0 },
    remainingMessages: { type: Number, default: 0 },
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
  }
);

/* ============================================================
   AUTO LOGIC – PRE SAVE
============================================================ */
UserSchema.pre("save", function () {
  // 🧪 TRIAL USER
  if (this.isTrial) {
    this.plan = "premium";
    this.guests = 1000;
    this.paidAmount = 0;
    this.hasPaid = false;

    this.planLimits = {
      maxGuests: 1000,
      smsEnabled: true,
      smsLimit: 10,
      seatingEnabled: true,
      remindersEnabled: true,
    };

    // ❗ לא לדרוס אם כבר הוגדר (מיגרציה / תשלום)
    if (typeof this.maxMessages !== "number" || this.maxMessages === 0) {
      this.maxMessages = 10;
    }

    if (
      typeof this.remainingMessages !== "number" ||
      this.remainingMessages === 0
    ) {
      this.remainingMessages = Math.max(
        this.maxMessages - (this.smsUsed ?? 0),
        0
      );
    }

    return;
  }

  // 💳 PAID USER
  // ❌ אין SMS דרך planLimits
  this.planLimits.smsLimit = 0;
});

/* ============================================================
   AUTO LOGIC – FIND ONE AND UPDATE
============================================================ */
UserSchema.pre("findOneAndUpdate", function () {
  const rawUpdate = (this as any).getUpdate() || {};
  const isUsingSet = !!rawUpdate.$set;
  const update = isUsingSet ? rawUpdate.$set : rawUpdate;

  // 🧪 Trial update
  if (update.isTrial === true) {
    update.plan = "premium";
    update.guests = 1000;
    update.paidAmount = 0;
    update.hasPaid = false;

    update.planLimits = {
      maxGuests: 1000,
      smsEnabled: true,
      smsLimit: 10,
      seatingEnabled: true,
      remindersEnabled: true,
    };

    if (typeof update.maxMessages !== "number") {
      update.maxMessages = 10;
    }

    if (typeof update.remainingMessages !== "number") {
      update.remainingMessages = Math.max(
        update.maxMessages - (update.smsUsed ?? 0),
        0
      );
    }
  }

  if (isUsingSet) rawUpdate.$set = update;
  (this as any).setUpdate(rawUpdate);
});

/* ============================================================
   MODEL
============================================================ */
export default models.User ||
  mongoose.model<IUser>("User", UserSchema);
