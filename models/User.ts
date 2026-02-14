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

  plan: "basic" | "premium";
  guests: number;

  paidAmount: number;
  hasPaid: boolean;

  producerId?: mongoose.Types.ObjectId | null;
  createdByProducer?: mongoose.Types.ObjectId | null;
  createdByAdmin?: boolean;

  // לעובד מפיק - לאיזה מפיק הוא שייך
  assignedProducerId?: mongoose.Types.ObjectId | null;

  // אם אצלך כבר בשימוש במקום אחר - משאירה
  assignedStaffIds?: mongoose.Types.ObjectId[];

  // ✅ חדש: משתמשים (לקוחות) שמוקצים לעובד
  assignedClientIds?: mongoose.Types.ObjectId[];

  billingSource?: "site" | "admin" | "producer";

  producerPricePerRecord?: number;

  includeCalls: boolean;
  callsAddonPrice: number;

  includeCreditGifts: boolean;
  creditGiftsAddonPrice: number;

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

    plan: {
      type: String,
      enum: ["basic", "premium"],
      default: "basic",
    },

    guests: { type: Number, default: 100 },

    paidAmount: { type: Number, default: 0 },
    hasPaid: { type: Boolean, default: false },

    createdByAdmin: { type: Boolean, default: false },

    assignedProducerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // נשאר אם כבר בשימוש אצלך
    assignedStaffIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ✅ חדש: הקצאת לקוחות לעובד
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

    smsPerRecord: { type: Number, default: 3 },
    maxMessages: { type: Number, default: 0 },

    planLimits: {
      maxGuests: { type: Number, default: 100 },
      smsEnabled: { type: Boolean, default: true },
      smsLimit: { type: Number, default: 0 },
      seatingEnabled: { type: Boolean, default: false },
      remindersEnabled: { type: Boolean, default: true },
    },

    smsBalance: { type: Number, default: 0 },
    smsUsed: { type: Number, default: 0 },
    testSmsUsed: { type: Number, default: 0 },

    whatsappBalance: { type: Number, default: 0 },
whatsappUsed: { type: Number, default: 0 },


    isTrial: { type: Boolean, default: false },
    trialStartedAt: Date,
    trialExpiresAt: Date,

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

UserSchema.pre("validate", async function () {
  const doc = this as HydratedDocument<IUser>;

  // בונוס: includeCalls => includeCreditGifts
  if (doc.includeCalls) {
    doc.includeCreditGifts = true;
    doc.creditGiftsAddonPrice = 0;
  }

  // אם לא staff - ניקוי שדות צוות
  if (doc.role === "user" || doc.role === "admin") {
  doc.staffType = null;
  doc.assignedProducerId = null;
  doc.assignedClientIds = [];
}

  // אם staff בלי סוג - ברירת מחדל עובד מפיק
  if (doc.role === "staff" && !doc.staffType) {
    doc.staffType = "producer_staff";
  }

  // עובד כללי - בלי שיוך למפיק ובלי רשימת לקוחות חובה
  if (doc.role === "staff" && doc.staffType === "general_staff") {
    doc.assignedProducerId = null;
    // אפשר להשאיר assignedClientIds אם תרצי, אבל לא חובה
  }

  // עובד מפיק חייב שיוך למפיק
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

  // מניעת כפילויות ב-assignedClientIds
  if (Array.isArray(doc.assignedClientIds) && doc.assignedClientIds.length > 0) {
    const unique = Array.from(
      new Set(doc.assignedClientIds.map((id) => String(id)))
    ).map((id) => new mongoose.Types.ObjectId(id));
    doc.assignedClientIds = unique;
  }
});

UserSchema.pre("save", async function () {
  const doc = this as HydratedDocument<IUser>;

  if (doc.isTrial) {
    doc.plan = "premium";
    doc.guests = 1000;
    doc.smsPerRecord = 3;
    doc.maxMessages = 3000;
    doc.hasPaid = false;

    doc.planLimits = {
      maxGuests: 1000,
      smsEnabled: true,
      smsLimit: 10,
      seatingEnabled: true,
      remindersEnabled: true,
    };
    return;
  }

  if (doc.role === "client" && doc.createdByProducer) {
    doc.smsPerRecord ||= 3;
    doc.maxMessages = (doc.guests || 0) * (doc.smsPerRecord || 0);
    doc.hasPaid = false;
    doc.paidAmount ||= 0;

    doc.planLimits = {
      maxGuests: doc.guests,
      smsEnabled: true,
      smsLimit: 0,
      seatingEnabled: true,
      remindersEnabled: true,
    };
    return;
  }

  if (doc.guests && doc.smsPerRecord) {
    doc.maxMessages = doc.guests * doc.smsPerRecord;
  }
});

/* ============================================================
   INDEXES
============================================================ */

UserSchema.index({ role: 1, staffType: 1 });
UserSchema.index({ assignedProducerId: 1, role: 1, staffType: 1 });
UserSchema.index({ assignedProducerId: 1, assignedClientIds: 1, role: 1 });

/* ============================================================
   MODEL
============================================================ */

const User = models.User || model<IUser>("User", UserSchema);
export default User;
