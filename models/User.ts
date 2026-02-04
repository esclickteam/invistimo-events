import mongoose, { Schema, Document, models } from "mongoose";

/* ============================================================
   TYPES
============================================================ */

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;

  phone?: string;

  role: "user" | "client" | "producer" | "photographer" | "admin";

  plan: "basic" | "premium";
  guests: number;
  paidAmount: number;

  hasPaid: boolean;

  producerId?: mongoose.Types.ObjectId | null;
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

  /** legacy – נשאר בשביל ראוטים קיימים */
  maxMessages: number;
  remainingMessages: number;

  /** מקור אמת חדש */
  smsBalance: number;

  /** סטטיסטיקה בלבד */
  smsUsed: number;
  testSmsUsed: number;

  isTrial: boolean;
  trialStartedAt?: Date;
  trialExpiresAt?: Date;

  isDemoUser?: boolean;

  needsPasswordSetup?: boolean;

  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  createdAt: Date;
  updatedAt: Date;
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

    password: {
      type: String,
      required: function (this: any) {
        return !this.needsPasswordSetup;
      },
      minlength: [6, "Password must be at least 6 characters"],
    },

    phone: { type: String, trim: true, default: "" },

    role: {
      type: String,
      enum: ["user", "client", "producer", "photographer", "admin"],
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

    producerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

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
      smsLimit: { type: Number, default: 0 },
      seatingEnabled: { type: Boolean, default: false },
      remindersEnabled: { type: Boolean, default: true },
    },

    /** legacy */
    maxMessages: { type: Number, default: 0 },
    remainingMessages: { type: Number, default: 0 },

    /** חדש */
    smsBalance: { type: Number, default: 0 },

    smsUsed: { type: Number, default: 0 },
    testSmsUsed: { type: Number, default: 0 },

    isTrial: { type: Boolean, default: false },
    trialStartedAt: Date,
    trialExpiresAt: Date,

    isDemoUser: { type: Boolean, default: false },

    needsPasswordSetup: { type: Boolean, default: false },

    resetPasswordToken: { type: String, index: true },
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);




/* ============================================================
   AUTO LOGIC – PRE SAVE
============================================================ */
UserSchema.pre("save", function () {
  /* 🎁 BONUS RULE */
  if (this.includeCalls === true) {
    this.includeCreditGifts = true;
    this.creditGiftsAddonPrice = 0;
  }

  /* 🧪 TRIAL USER */
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

    if (typeof this.smsBalance !== "number" || this.smsBalance === 0) {
      this.smsBalance = 10;
    }

    return;
  }

  /* 💼 PAID CLIENT CREATED BY PRODUCER */
  if (this.hasPaid && this.role === "client" && this.createdByProducer) {
    const MESSAGES_PER_GUEST = 3;
    const baseMessages = this.guests * MESSAGES_PER_GUEST;

    if (typeof this.smsBalance !== "number" || this.smsBalance === 0) {
      this.smsBalance = baseMessages;
    }

    this.planLimits = {
      maxGuests: this.guests,
      smsEnabled: true,
      smsLimit: 0,
      seatingEnabled: true,
      remindersEnabled: true,
    };

    return;
  }

  /* 💳 PAID USER – לא לדרוס */
  if (this.hasPaid) {
    return;
  }
});

/* ============================================================
   AUTO LOGIC – FIND ONE AND UPDATE
============================================================ */
UserSchema.pre("findOneAndUpdate", function () {
  const rawUpdate = (this as any).getUpdate() || {};
  const isUsingSet = !!rawUpdate.$set;
  const update = isUsingSet ? rawUpdate.$set : rawUpdate;

  /* 🎁 BONUS RULE */
  if (update.includeCalls === true) {
    update.includeCreditGifts = true;
    update.creditGiftsAddonPrice = 0;
  }

  /* 🧪 TRIAL USER */
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

    if (typeof update.smsBalance !== "number") {
      update.smsBalance = 10;
    }
  }

  /* 💼 PAID CLIENT CREATED BY PRODUCER */
  if (
    update.hasPaid === true &&
    update.role === "client" &&
    update.createdByProducer &&
    typeof update.guests === "number"
  ) {
    const MESSAGES_PER_GUEST = 3;
    const baseMessages = update.guests * MESSAGES_PER_GUEST;

    if (typeof update.smsBalance !== "number") {
      update.smsBalance = baseMessages;
    }

    update.planLimits = {
      maxGuests: update.guests,
      smsEnabled: true,
      smsLimit: 0,
      seatingEnabled: true,
      remindersEnabled: true,
    };
  }

  if (isUsingSet) rawUpdate.$set = update;
  (this as any).setUpdate(rawUpdate);
});

/* ============================================================
   MODEL
============================================================ */
export default models.User || mongoose.model<IUser>("User", UserSchema);
