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
  createdByAdmin?: boolean;

  /** ===== ADDONS ===== */
  includeCalls: boolean;
  callsAddonPrice: number;

  includeCreditGifts: boolean;
  creditGiftsAddonPrice: number;

  /** ===== BILLING META ===== */
  billingSource?: "site" | "admin" | "producer";

  /** ===== PRODUCER PRICING ===== */
  producerPricePerRecord?: number;

  /** ===== SMS / RECORD LOGIC ===== */
  smsPerRecord: number;

  planLimits: {
    maxGuests: number;
    smsEnabled: boolean;
    smsLimit: number;
    seatingEnabled: boolean;
    remindersEnabled: boolean;
  };

  maxMessages: number;

  smsBalance: number;

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
    hasPaid: { type: Boolean, default: false },

    producerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdByProducer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdByAdmin: { type: Boolean, default: false },

    billingSource: {
      type: String,
      enum: ["site", "admin", "producer"],
      default: "site",
    },

    /** ===== ADDONS ===== */
    includeCalls: { type: Boolean, default: false },
    callsAddonPrice: { type: Number, default: 0 },

    includeCreditGifts: { type: Boolean, default: false },
    creditGiftsAddonPrice: { type: Number, default: 0 },

    /** ===== PRODUCER ===== */
    producerPricePerRecord: { type: Number, default: 0 },

    /** ===== SMS LOGIC ===== */
    smsPerRecord: { type: Number, default: 3 },

    planLimits: {
      maxGuests: { type: Number, default: 100 },
      smsEnabled: { type: Boolean, default: true },
      smsLimit: { type: Number, default: 0 },
      seatingEnabled: { type: Boolean, default: false },
      remindersEnabled: { type: Boolean, default: true },
    },

    maxMessages: { type: Number, default: 0 },

    smsBalance: { type: Number, default: 0 },

    smsUsed: { type: Number, default: 0 },
    testSmsUsed: { type: Number, default: 0 },

    isTrial: { type: Boolean, default: false },
    trialStartedAt: Date,
    trialExpiresAt: Date,

    isDemoUser: { type: Boolean, default: false },

    needsPasswordSetup: { type: Boolean, default: false },

    resetPasswordToken: { type: String },
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

/* ============================================================
   AUTO LOGIC – PRE SAVE
============================================================ */

UserSchema.pre("save", function () {
  /** 🎁 BONUS */
  if (this.includeCalls) {
    this.includeCreditGifts = true;
    this.creditGiftsAddonPrice = 0;
  }

  /** 🧪 TRIAL */
  if (this.isTrial) {
    this.plan = "premium";
    this.guests = 1000;
    this.smsPerRecord = 3;
    this.maxMessages = 3000;
    this.hasPaid = false;

    this.planLimits = {
      maxGuests: 1000,
      smsEnabled: true,
      smsLimit: 10,
      seatingEnabled: true,
      remindersEnabled: true,
    };
    return;
  }

  /** 💼 CLIENT BY PRODUCER */
  if (this.role === "client" && this.createdByProducer) {
    this.smsPerRecord ||= 3;
    this.maxMessages = this.guests * this.smsPerRecord;
    this.hasPaid = true;

    this.planLimits = {
      maxGuests: this.guests,
      smsEnabled: true,
      smsLimit: 0,
      seatingEnabled: true,
      remindersEnabled: true,
    };
    return;
  }

  /** 👤 USER / ADMIN CUSTOM */
  if (this.guests && this.smsPerRecord) {
    this.maxMessages = this.guests * this.smsPerRecord;
  }
});

/* ============================================================
   MODEL
============================================================ */

export default models.User || mongoose.model<IUser>("User", UserSchema);
