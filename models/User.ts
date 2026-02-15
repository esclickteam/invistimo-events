import mongoose, {
  Schema,
  Document,
  models,
  model,
  HydratedDocument,
} from "mongoose";

/* ============================================================
   TYPES
============================================================ */

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  phone?: string;

  role: "user" | "client" | "producer" | "staff" | "admin";
  staffType?: "producer_staff" | "general_staff" | null;

  /* 🔥 UPDATED PLAN TYPES */
  plan: "basic" | "premium" | "plan1" | "plan2" | "plan3";

  guests: number;

  paidAmount: number;
  hasPaid: boolean;
  isActive: boolean;

  producerId?: mongoose.Types.ObjectId | null;
  createdByProducer?: mongoose.Types.ObjectId | null;
  createdByAdmin?: boolean;

  assignedProducerId?: mongoose.Types.ObjectId | null;
  assignedStaffIds?: mongoose.Types.ObjectId[];
  assignedClientIds?: mongoose.Types.ObjectId[];

  billingSource?: "site" | "admin" | "producer";
  producerPricePerRecord?: number;

  includeCalls: boolean;
  callsAddonPrice: number;

  includeCreditGifts: boolean;
  creditGiftsAddonPrice: number;

  /* 🔥 NEW ADDON FLAGS */
  selfManageEnabled: boolean;
  customDesignEnabled: boolean;

  smsPerRecord: number;
  maxMessages: number;

  planLimits: {
    maxGuests: number;
    smsEnabled: boolean;
    smsLimit: number;
    seatingEnabled: boolean;
    remindersEnabled: boolean;
  };

  smsBalance: number;
  smsUsed: number;
  testSmsUsed: number;

  whatsappBalance: number;
  whatsappUsed: number;

  isTrial: boolean;

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
      required: function (this: HydratedDocument<IUser>) {
        return !this.needsPasswordSetup;
      },
    },

    phone: { type: String, trim: true, default: "" },

    role: {
      type: String,
      enum: ["user", "client", "producer", "staff", "admin"],
      default: "user",
      index: true,
    },

    staffType: {
      type: String,
      enum: ["producer_staff", "general_staff"],
      default: null,
      index: true,
    },

    /* 🔥 UPDATED PLAN ENUM */
    plan: {
      type: String,
      enum: ["basic", "premium", "plan1", "plan2", "plan3"],
      default: "basic",
    },

    guests: { type: Number, default: 0 },

    paidAmount: { type: Number, default: 0 },
    hasPaid: { type: Boolean, default: false },

    isActive: {
      type: Boolean,
      default: false,
    },

    createdByAdmin: { type: Boolean, default: false },

    assignedProducerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    assignedStaffIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    assignedClientIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    billingSource: {
      type: String,
      enum: ["site", "admin", "producer"],
      default: "site",
    },

    producerPricePerRecord: { type: Number, default: 0 },

    includeCalls: { type: Boolean, default: false },
    callsAddonPrice: { type: Number, default: 0 },

    includeCreditGifts: { type: Boolean, default: false },
    creditGiftsAddonPrice: { type: Number, default: 0 },

    /* 🔥 NEW FIELDS */
    selfManageEnabled: { type: Boolean, default: false },
    customDesignEnabled: { type: Boolean, default: false },

    smsPerRecord: { type: Number, default: 0 },
    maxMessages: { type: Number, default: 0 },

    planLimits: {
      maxGuests: { type: Number, default: 0 },
      smsEnabled: { type: Boolean, default: false },
      smsLimit: { type: Number, default: 0 },
      seatingEnabled: { type: Boolean, default: false },
      remindersEnabled: { type: Boolean, default: false },
    },

    smsBalance: { type: Number, default: 0 },
    smsUsed: { type: Number, default: 0 },
    testSmsUsed: { type: Number, default: 0 },

    whatsappBalance: { type: Number, default: 0 },
    whatsappUsed: { type: Number, default: 0 },

    isTrial: { type: Boolean, default: false },

    isDemoUser: { type: Boolean, default: false },

    needsPasswordSetup: {
      type: Boolean,
      default: true,
    },

    resetPasswordToken: { type: String },
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);

/* ============================================================
   HOOKS
============================================================ */

UserSchema.pre("validate", function () {
  const doc = this as HydratedDocument<IUser>;

  if (doc.includeCalls) {
    doc.includeCreditGifts = true;
    doc.creditGiftsAddonPrice = 0;
  }

  if (doc.role === "user" || doc.role === "admin") {
    doc.staffType = null;
    doc.assignedProducerId = null;
    doc.assignedClientIds = [];
  }

  if (doc.role === "staff" && !doc.staffType) {
    doc.staffType = "producer_staff";
  }

  if (
    doc.role === "staff" &&
    doc.staffType === "producer_staff" &&
    !doc.assignedProducerId
  ) {
    doc.invalidate(
      "assignedProducerId",
      "assignedProducerId is required for producer_staff"
    );
  }

  if (Array.isArray(doc.assignedClientIds)) {
    doc.assignedClientIds = Array.from(
      new Set(doc.assignedClientIds.map(String))
    ).map((id) => new mongoose.Types.ObjectId(id));
  }
});

/* ============================================================
   INDEXES
============================================================ */

UserSchema.index({ role: 1, staffType: 1 });
UserSchema.index({ assignedProducerId: 1, role: 1 });
UserSchema.index({ assignedProducerId: 1, assignedClientIds: 1 });

/* ============================================================
   MODEL
============================================================ */

const User = models.User || model<IUser>("User", UserSchema);
export default User;
