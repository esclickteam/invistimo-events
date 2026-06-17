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

  role: "user" | "client" | "producer" | "staff" | "admin" | "venue_owner";

staffType?: "producer_staff" | "general_staff" | null;

employeeScope?: "system" | "producer" | "venue" | "client" | null;

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

  salesUpsells?: {
    digitalSeating?: {
      enabled: boolean;
      price: number;
      givenFree?: boolean;
      notes?: string;
    };

    venueSeating?: {
      enabled: boolean;
      staffCount: number;
      totalPrice: number;
      depositAmount: number;
      eventDayBalance: number;
      notes?: string;
    };

    personalRepresentative?: {
      enabled: boolean;
      price: number;
      givenFree?: boolean;
      notes?: string;
    };

    thirdRsvpRound?: {
      enabled: boolean;
      price: number;
      givenFree?: boolean;
      notes?: string;
    };

    suppliersBudgetSystem?: {
      enabled: boolean;
      price: number;
      givenFree?: boolean;
      notes?: string;
    };

    alcoholManagement?: {
      enabled: boolean;
      staffCount: number;
      totalPrice: number;
      depositAmount: number;
      eventDayBalance: number;
      notes?: string;
    };
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

    billingSource?: "site" | "admin" | "producer" | "pricing" | "venue";
  producerPricePerRecord?: number;

  // לקוח שנוצר דרך אולם
  venueClientSource?: boolean;
  venueOwnerId?: mongoose.Types.ObjectId | null;

  venueHallId?: string;
  venueHallName?: string;

  venueClientHallId?: string;
  venueClientHallName?: string;
  venueClientPackageType?: "seating_only" | "rsvp_seating" | "full";
  venueClientPaymentStatus?: "pending" | "paid" | "failed" | "free";
  venueClientPaymentAmount?: number;
  venueClientRecordsCount?: number;

  // תבנית הושבה שהאולם בחר ללקוח
  venueSeatingTemplateId?: mongoose.Types.ObjectId | null;
  venueSeatingTemplateName?: string;

  // מסמן שהתבנית כבר הועתקה פעם אחת להושבה של הלקוח
  venueSeatingTemplateImportedAt?: Date | null;

  includeCalls: boolean;
  callsRounds: number;
  callsAddonPrice: number;
  callsEnabledBy?: "admin" | "system" | "stripe" | null;
  callsEnabledAt?: Date | null;

    callRoundsSchedule?: {
    enabled: boolean;
    rounds: {
      roundNumber: number;
      title?: string;
      scheduledAt?: Date | null;
      status: "draft" | "scheduled" | "done" | "cancelled";
      notes?: string;
      createdAt?: Date;
      updatedAt?: Date;
    }[];
  };

  includeCreditGifts: boolean;
  creditGiftsAddonPrice: number;

  includeDigitalSeating: boolean;
  includeEventManagement: boolean;
  includeCustomDesign: boolean;

  accessModules?: {
    rsvpSeating: boolean;
    eventProduction: boolean;

    venues?: boolean;
    venueDashboard?: boolean;
    venueCrm?: boolean;
    venueCalendar?: boolean;
    venueMenus?: boolean;
    venueStaff?: boolean;
  };

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
      enum: ["user", "client", "producer", "staff", "admin", "venue_owner"],
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

    employeeScope: {
  type: String,
  enum: ["system", "producer", "venue", "client"],
  default: null,
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

    salesUpsells: {
      digitalSeating: {
        enabled: {
          type: Boolean,
          default: false,
          index: true,
        },

        price: {
          type: Number,
          default: 0,
        },

        givenFree: {
          type: Boolean,
          default: false,
        },

        notes: {
          type: String,
          trim: true,
          default: "",
        },
      },

      venueSeating: {
        enabled: {
          type: Boolean,
          default: false,
          index: true,
        },

        staffCount: {
          type: Number,
          default: 0,
        },

        totalPrice: {
          type: Number,
          default: 0,
        },

        depositAmount: {
          type: Number,
          default: 0,
        },

        eventDayBalance: {
          type: Number,
          default: 0,
        },

        notes: {
          type: String,
          trim: true,
          default: "",
        },
      },

      personalRepresentative: {
        enabled: {
          type: Boolean,
          default: false,
          index: true,
        },

        price: {
          type: Number,
          default: 0,
        },

        givenFree: {
          type: Boolean,
          default: false,
        },

        notes: {
          type: String,
          trim: true,
          default: "",
        },
      },

      thirdRsvpRound: {
        enabled: {
          type: Boolean,
          default: false,
          index: true,
        },

        price: {
          type: Number,
          default: 0,
        },

        givenFree: {
          type: Boolean,
          default: false,
        },

        notes: {
          type: String,
          trim: true,
          default: "",
        },
      },

      suppliersBudgetSystem: {
        enabled: {
          type: Boolean,
          default: false,
          index: true,
        },

        price: {
          type: Number,
          default: 0,
        },

        givenFree: {
          type: Boolean,
          default: false,
        },

        notes: {
          type: String,
          trim: true,
          default: "",
        },
      },

      alcoholManagement: {
        enabled: {
          type: Boolean,
          default: false,
          index: true,
        },

        staffCount: {
          type: Number,
          default: 0,
        },

        totalPrice: {
          type: Number,
          default: 0,
        },

        depositAmount: {
          type: Number,
          default: 0,
        },

        eventDayBalance: {
          type: Number,
          default: 0,
        },

        notes: {
          type: String,
          trim: true,
          default: "",
        },
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
  enum: ["site", "admin", "producer", "pricing", "venue"],
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

        callRoundsSchedule: {
      enabled: {
        type: Boolean,
        default: false,
      },

      rounds: [
        {
          roundNumber: {
            type: Number,
            required: true,
            min: 1,
            max: 3,
          },

          title: {
            type: String,
            trim: true,
            default: "",
          },

          scheduledAt: {
            type: Date,
            default: null,
          },

          status: {
            type: String,
            enum: ["draft", "scheduled", "done", "cancelled"],
            default: "draft",
          },

          notes: {
            type: String,
            trim: true,
            default: "",
          },

          createdAt: {
            type: Date,
            default: Date.now,
          },

          updatedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
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

    accessModules: {
      rsvpSeating: {
        type: Boolean,
        default: true,
        index: true,
      },

      eventProduction: {
        type: Boolean,
        default: false,
        index: true,
      },

      venues: {
        type: Boolean,
        default: false,
        index: true,
      },

      venueDashboard: {
        type: Boolean,
        default: false,
        index: true,
      },

      venueCrm: {
        type: Boolean,
        default: false,
        index: true,
      },

      venueCalendar: {
        type: Boolean,
        default: false,
        index: true,
      },

      venueMenus: {
        type: Boolean,
        default: false,
        index: true,
      },

      venueStaff: {
        type: Boolean,
        default: false,
        index: true,
      },
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

  const currentSalesUpsells = doc.salesUpsells || {};
  const currentVenueSeatingService = doc.venueSeatingService || {
    enabled: false,
    totalPrice: 0,
    depositAmount: 0,
    venuePaymentAmount: 0,
    staffPaymentAmount: 0,
    staffPaidFromVenue: 0,
    staffPaidFromFullAmount: 0,
    venuePaymentAfterStaff: 0,
    totalAfterStaff: 0,
  };

  const existingVenueSeatingEnabled = Boolean(
    currentSalesUpsells.venueSeating?.enabled ||
      currentVenueSeatingService.enabled
  );

  const existingThirdRsvpRoundEnabled = Boolean(
    currentSalesUpsells.thirdRsvpRound?.enabled ||
      Number(doc.allowedMessageRounds) === 3 ||
      Number(doc.planLimits?.allowedMessageRounds) === 3
  );

  doc.salesUpsells = {
    digitalSeating: {
      enabled: Boolean(
        currentSalesUpsells.digitalSeating?.enabled || doc.includeDigitalSeating
      ),
      price: Number(currentSalesUpsells.digitalSeating?.price || 0),
      givenFree: Boolean(currentSalesUpsells.digitalSeating?.givenFree),
      notes: String(currentSalesUpsells.digitalSeating?.notes || ""),
    },

    venueSeating: {
      enabled: existingVenueSeatingEnabled,
      staffCount: Number(currentSalesUpsells.venueSeating?.staffCount || 0),
      totalPrice: Number(
        currentSalesUpsells.venueSeating?.totalPrice ||
          currentVenueSeatingService.totalPrice ||
          0
      ),
      depositAmount: Number(
        currentSalesUpsells.venueSeating?.depositAmount ||
          currentVenueSeatingService.depositAmount ||
          0
      ),
      eventDayBalance: Number(
        currentSalesUpsells.venueSeating?.eventDayBalance || 0
      ),
      notes: String(currentSalesUpsells.venueSeating?.notes || ""),
    },

    personalRepresentative: {
      enabled: Boolean(currentSalesUpsells.personalRepresentative?.enabled),
      price: Number(currentSalesUpsells.personalRepresentative?.price || 0),
      givenFree: Boolean(currentSalesUpsells.personalRepresentative?.givenFree),
      notes: String(currentSalesUpsells.personalRepresentative?.notes || ""),
    },

    thirdRsvpRound: {
      enabled: existingThirdRsvpRoundEnabled,
      price: Number(currentSalesUpsells.thirdRsvpRound?.price || 0),
      givenFree: Boolean(currentSalesUpsells.thirdRsvpRound?.givenFree),
      notes: String(currentSalesUpsells.thirdRsvpRound?.notes || ""),
    },

    suppliersBudgetSystem: {
      enabled: Boolean(currentSalesUpsells.suppliersBudgetSystem?.enabled),
      price: Number(currentSalesUpsells.suppliersBudgetSystem?.price || 0),
      givenFree: Boolean(currentSalesUpsells.suppliersBudgetSystem?.givenFree),
      notes: String(currentSalesUpsells.suppliersBudgetSystem?.notes || ""),
    },

    alcoholManagement: {
      enabled: Boolean(currentSalesUpsells.alcoholManagement?.enabled),
      staffCount: Number(currentSalesUpsells.alcoholManagement?.staffCount || 0),
      totalPrice: Number(currentSalesUpsells.alcoholManagement?.totalPrice || 0),
      depositAmount: Number(
        currentSalesUpsells.alcoholManagement?.depositAmount || 0
      ),
      eventDayBalance: Number(
        currentSalesUpsells.alcoholManagement?.eventDayBalance || 0
      ),
      notes: String(currentSalesUpsells.alcoholManagement?.notes || ""),
    },
  };

  if (doc.salesUpsells.digitalSeating?.enabled) {
    doc.includeDigitalSeating = true;
  }

  if (doc.salesUpsells.thirdRsvpRound?.enabled) {
    doc.allowedMessageRounds = 3;
    doc.planLimits = {
      ...(doc.planLimits || {}),
      allowedMessageRounds: 3,
    };
  }

  if (doc.salesUpsells.suppliersBudgetSystem?.enabled) {
    doc.includeEventManagement = true;
    doc.selfManageEnabled = true;
  }

  if (doc.salesUpsells.venueSeating?.enabled) {
    doc.venueSeatingService = {
      ...(currentVenueSeatingService || {}),
      enabled: true,
      totalPrice:
        doc.salesUpsells.venueSeating.totalPrice ||
        currentVenueSeatingService.totalPrice ||
        0,
      depositAmount:
        doc.salesUpsells.venueSeating.depositAmount ||
        currentVenueSeatingService.depositAmount ||
        0,
      venuePaymentAmount: currentVenueSeatingService.venuePaymentAmount || 0,
      staffPaymentAmount: currentVenueSeatingService.staffPaymentAmount || 0,
      staffPaidFromVenue: currentVenueSeatingService.staffPaidFromVenue || 0,
      staffPaidFromFullAmount:
        currentVenueSeatingService.staffPaidFromFullAmount || 0,
      venuePaymentAfterStaff:
        currentVenueSeatingService.venuePaymentAfterStaff || 0,
      totalAfterStaff: currentVenueSeatingService.totalAfterStaff || 0,
    };
  }


    if (doc.includeCalls) {
    doc.callsRounds = doc.callsRounds || 3;

    doc.planLimits = {
      ...(doc.planLimits || {}),
      callsEnabled: true,
    };

    doc.callRoundsSchedule = {
      enabled: doc.callRoundsSchedule?.enabled ?? true,
      rounds: doc.callRoundsSchedule?.rounds || [],
    };
  } else {
    doc.callsRounds = 0;

    doc.planLimits = {
      ...(doc.planLimits || {}),
      callsEnabled: false,
    };

    doc.callRoundsSchedule = {
      enabled: false,
      rounds: [],
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

  /*
    הרשאות מודולים:
    rsvpSeating = אישורי הגעה / הושבה
    eventProduction = הפקת אירוע
    venues = מערכת אולמות
  */
  const isVenueOwner = doc.role === "venue_owner";

  doc.accessModules = {
    rsvpSeating: Boolean(
      doc.accessModules?.rsvpSeating ?? doc.includeDigitalSeating ?? true
    ),

    eventProduction: Boolean(
      doc.accessModules?.eventProduction || doc.includeEventManagement
    ),

    venues: Boolean(doc.accessModules?.venues ?? isVenueOwner),

    venueDashboard: Boolean(
      doc.accessModules?.venueDashboard ?? isVenueOwner
    ),

    venueCrm: Boolean(doc.accessModules?.venueCrm ?? isVenueOwner),

    venueCalendar: Boolean(
      doc.accessModules?.venueCalendar ?? isVenueOwner
    ),

    venueMenus: Boolean(doc.accessModules?.venueMenus ?? isVenueOwner),

    venueStaff: Boolean(doc.accessModules?.venueStaff ?? isVenueOwner),
  };

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
  doc.employeeScope = null;
  doc.assignedProducerId = null;
  doc.assignedClientIds = [];
}

if (
  doc.role === "user" ||
  doc.role === "client" ||
  doc.role === "producer" ||
  doc.role === "venue_owner"
) {
  doc.staffType = null;
  doc.employeeScope = null;
}

/*
  עובד כללי של Invistimo:
  role = staff
  staffType = general_staff
  employeeScope = system
*/
if (doc.role === "staff" && !doc.staffType) {
  doc.staffType = "general_staff";
}

if (
  doc.role === "staff" &&
  doc.staffType === "general_staff" &&
  !doc.employeeScope
) {
  doc.employeeScope = "system";
}

/*
  עובד של מפיק:
  role = staff
  staffType = producer_staff
  employeeScope = producer
*/
if (doc.role === "staff" && doc.staffType === "producer_staff") {
  doc.employeeScope = "producer";

  if (!doc.assignedProducerId) {
    doc.invalidate(
      "assignedProducerId",
      "assignedProducerId is required for producer_staff"
    );
  }
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
UserSchema.index({ role: 1, staffType: 1, employeeScope: 1 });
UserSchema.index({ assignedProducerId: 1, role: 1 });
UserSchema.index({ assignedProducerId: 1, assignedClientIds: 1 });
UserSchema.index({ email: 1, role: 1 });
UserSchema.index({ eventDate: 1 });
UserSchema.index({ plan: 1, hasPaid: 1 });
UserSchema.index({ isDemoUser: 1 });
UserSchema.index({ role: 1, "accessModules.venues": 1 });
UserSchema.index({ "callRoundsSchedule.enabled": 1 });
UserSchema.index({ "callRoundsSchedule.rounds.scheduledAt": 1 });
UserSchema.index({ "callRoundsSchedule.rounds.status": 1 });

UserSchema.index({ "salesUpsells.digitalSeating.enabled": 1 });
UserSchema.index({ "salesUpsells.venueSeating.enabled": 1 });
UserSchema.index({ "salesUpsells.personalRepresentative.enabled": 1 });
UserSchema.index({ "salesUpsells.thirdRsvpRound.enabled": 1 });
UserSchema.index({ "salesUpsells.suppliersBudgetSystem.enabled": 1 });
UserSchema.index({ "salesUpsells.alcoholManagement.enabled": 1 });

/* ============================================================
   MODEL
============================================================ */
const User = models.User || model<IUser>("User", UserSchema);

export default User;