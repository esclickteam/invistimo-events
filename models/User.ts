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

  plan: "basic" | "premium" | "plan1" | "plan2" | "plan3";
  priceKey?: string;
  packageName?: string;

  guests: number;
  maxGuests: number;

  allowedMessageRounds: 2 | 3;

  venueSeatingService?: {
    enabled: boolean;
    totalPrice: number;
    depositAmount: number;
    venuePaymentAmount: number;
    staffPaymentAmount: number;
    staffPaidFromVenue: number;
    staffPaidFromFullAmount: number;
    venuePaymentAfterStaff: number;
    totalAfterStaff: number;
  };

  paidAmount: number;
  hasPaid: boolean;
  isActive: boolean;

  eventDate?: Date | null;

  producerId?: mongoose.Types.ObjectId | null;
  createdByProducer?: mongoose.Types.ObjectId | null;
  createdByAdmin?: boolean;

  assignedProducerId?: mongoose.Types.ObjectId | null;
  assignedStaffIds?: mongoose.Types.ObjectId[];
  assignedClientIds?: mongoose.Types.ObjectId[];

  billingSource?: "site" | "admin" | "producer" | "pricing";
  producerPricePerRecord?: number;

  includeCalls: boolean;
  callsRounds: number;
  callsAddonPrice: number;
  callsEnabledBy?: "admin" | "system" | "stripe" | null;
  callsEnabledAt?: Date | null;

  includeCreditGifts: boolean;
  creditGiftsAddonPrice: number;

  includeDigitalSeating: boolean;
  includeEventManagement: boolean;
  includeCustomDesign: boolean;

  selfManageEnabled: boolean;
  customDesignEnabled: boolean;

  smsPerRecord: number;
  smsLimit: number;
  maxMessages: number;

  planLimits: {
    maxGuests: number;
    allowedMessageRounds?: 2 | 3;
    smsEnabled: boolean;
    smsLimit: number;
    seatingEnabled: boolean;
    remindersEnabled: boolean;
    callsEnabled?: boolean;
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
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      required: function (this: HydratedDocument<IUser>) {
        return !this.needsPasswordSetup;
      },
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

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

    plan: {
      type: String,
      enum: ["basic", "premium", "plan1", "plan2", "plan3"],
      default: "basic",
      index: true,
    },

    priceKey: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    packageName: {
      type: String,
      trim: true,
      default: "",
    },

    guests: {
      type: Number,
      default: 0,
    },

    maxGuests: {
      type: Number,
      default: 0,
    },

    allowedMessageRounds: {
      type: Number,
      enum: [2, 3],
      default: 2,
    },

    venueSeatingService: {
      enabled: {
        type: Boolean,
        default: false,
      },

      totalPrice: {
        type: Number,
        default: 0,
      },

      depositAmount: {
        type: Number,
        default: 0,
      },

      venuePaymentAmount: {
        type: Number,
        default: 0,
      },

      staffPaymentAmount: {
        type: Number,
        default: 0,
      },

      staffPaidFromVenue: {
        type: Number,
        default: 0,
      },

      staffPaidFromFullAmount: {
        type: Number,
        default: 0,
      },

      venuePaymentAfterStaff: {
        type: Number,
        default: 0,
      },

      totalAfterStaff: {
        type: Number,
        default: 0,
      },
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    hasPaid: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },

    eventDate: {
      type: Date,
      default: null,
      index: true,
    },

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

    createdByAdmin: {
      type: Boolean,
      default: false,
    },

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
      enum: ["site", "admin", "producer", "pricing"],
      default: "site",
    },

    producerPricePerRecord: {
      type: Number,
      default: 0,
    },

    includeCalls: {
      type: Boolean,
      default: false,
    },

    callsRounds: {
      type: Number,
      default: 0,
    },

    callsAddonPrice: {
      type: Number,
      default: 0,
    },

    callsEnabledBy: {
      type: String,
      enum: ["admin", "system", "stripe"],
      default: undefined,
    },

    callsEnabledAt: {
      type: Date,
      default: null,
    },

    includeCreditGifts: {
      type: Boolean,
      default: false,
    },

    creditGiftsAddonPrice: {
      type: Number,
      default: 0,
    },

    includeDigitalSeating: {
      type: Boolean,
      default: false,
    },

    includeEventManagement: {
      type: Boolean,
      default: false,
    },

    includeCustomDesign: {
      type: Boolean,
      default: false,
    },

    selfManageEnabled: {
      type: Boolean,
      default: false,
    },

    customDesignEnabled: {
      type: Boolean,
      default: false,
    },

    smsPerRecord: {
      type: Number,
      default: 0,
    },

    smsLimit: {
      type: Number,
      default: 0,
    },

    maxMessages: {
      type: Number,
      default: 0,
    },

    planLimits: {
      maxGuests: {
        type: Number,
        default: 0,
      },

      allowedMessageRounds: {
        type: Number,
        enum: [2, 3],
        default: 2,
      },

      smsEnabled: {
        type: Boolean,
        default: false,
      },

      smsLimit: {
        type: Number,
        default: 0,
      },

      seatingEnabled: {
        type: Boolean,
        default: false,
      },

      remindersEnabled: {
        type: Boolean,
        default: false,
      },

      callsEnabled: {
        type: Boolean,
        default: false,
      },
    },

    smsBalance: {
      type: Number,
      default: 0,
    },

    smsUsed: {
      type: Number,
      default: 0,
    },

    testSmsUsed: {
      type: Number,
      default: 0,
    },

    whatsappBalance: {
      type: Number,
      default: 0,
    },

    whatsappUsed: {
      type: Number,
      default: 0,
    },

    isTrial: {
      type: Boolean,
      default: false,
    },

    isDemoUser: {
      type: Boolean,
      default: false,
    },

    needsPasswordSetup: {
      type: Boolean,
      default: true,
    },

    resetPasswordToken: {
      type: String,
      default: undefined,
    },

    resetPasswordExpires: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

/* ============================================================
   HOOKS
============================================================ */
UserSchema.pre("validate", function () {
  const doc = this as HydratedDocument<IUser>;

  if (doc.email) {
    doc.email = String(doc.email).trim().toLowerCase();
  }

  if (doc.includeCalls) {
    doc.callsRounds = doc.callsRounds || 3;

    doc.planLimits = {
      ...(doc.planLimits || {}),
      callsEnabled: true,
    };
  } else {
    doc.callsRounds = 0;

    doc.planLimits = {
      ...(doc.planLimits || {}),
      callsEnabled: false,
    };
  }

  if (doc.includeDigitalSeating) {
    doc.planLimits = {
      ...(doc.planLimits || {}),
      seatingEnabled: true,
    };
  }

  if (doc.includeEventManagement) {
    doc.selfManageEnabled = true;
  }

  if (doc.includeCustomDesign) {
    doc.customDesignEnabled = true;
  }

  if (doc.guests && !doc.maxGuests) {
    doc.maxGuests = doc.guests;
  }

  if (doc.maxGuests && !doc.guests) {
    doc.guests = doc.maxGuests;
  }

  if (doc.smsLimit && !doc.maxMessages) {
    doc.maxMessages = doc.smsLimit;
  }

  if (doc.maxMessages && !doc.smsLimit) {
    doc.smsLimit = doc.maxMessages;
  }

  if (doc.planLimits?.maxGuests && !doc.guests) {
    doc.guests = doc.planLimits.maxGuests;
  }

  /*
  ✅ חשוב:
  אם אחד מהשדות הוא 3 — שומרים 3.
  זה מונע מצב שבו default של allowedMessageRounds = 2
  דורס את planLimits.allowedMessageRounds = 3.
*/
  const directAllowedRounds = Number(doc.allowedMessageRounds);
  const planAllowedRounds = Number(doc.planLimits?.allowedMessageRounds);

  const normalizedAllowedMessageRounds: 2 | 3 =
    directAllowedRounds === 3 || planAllowedRounds === 3 ? 3 : 2;

  doc.allowedMessageRounds = normalizedAllowedMessageRounds;

  doc.planLimits = {
    ...(doc.planLimits || {}),
    allowedMessageRounds: normalizedAllowedMessageRounds,
  };

  if (doc.planLimits?.smsLimit && !doc.smsLimit) {
    doc.smsLimit = doc.planLimits.smsLimit;
    doc.maxMessages = doc.planLimits.smsLimit;
  }

  if (doc.role === "admin") {
    doc.staffType = null;
    doc.assignedProducerId = null;
    doc.assignedClientIds = [];
  }

  if (doc.role === "user" || doc.role === "client" || doc.role === "producer") {
    doc.staffType = null;
  }

  if (doc.role === "staff" && !doc.staffType) {
    doc.staffType = "general_staff";
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

  if (Array.isArray(doc.assignedStaffIds)) {
    doc.assignedStaffIds = Array.from(
      new Set(doc.assignedStaffIds.map(String))
    ).map((id) => new mongoose.Types.ObjectId(id));
  }
});

/* ============================================================
   INDEXES
============================================================ */
UserSchema.index({ role: 1, staffType: 1 });
UserSchema.index({ assignedProducerId: 1, role: 1 });
UserSchema.index({ assignedProducerId: 1, assignedClientIds: 1 });
UserSchema.index({ email: 1, role: 1 });
UserSchema.index({ eventDate: 1 });
UserSchema.index({ plan: 1, hasPaid: 1 });
UserSchema.index({ isDemoUser: 1 });

/* ============================================================
   MODEL
============================================================ */
const User = models.User || model<IUser>("User", UserSchema);

export default User;