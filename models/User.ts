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

staffType?:
  | "producer_staff"
  | "general_staff"
  | "seating_staff"
  | "usher_staff"
  | null;

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

    eventDayManager?: {
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

    preRsvpMessages?: {
      enabled: boolean;
      mode?:
        | "none"
        | "save_the_date_only"
        | "invitation_only"
        | "both";
      price: number;
      givenFree?: boolean;
      notes?: string;
      sentCount?: number;
      sentAt?: Date | null;
      saveTheDateEnabled?: boolean;
      invitationOnlyEnabled?: boolean;
      saveTheDateSentCount?: number;
      saveTheDateSentAt?: Date | null;
      invitationOnlySentCount?: number;
      invitationOnlySentAt?: Date | null;
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

    transportationManagement?: {
      enabled: boolean;
      price: number;
      givenFree?: boolean;
      notes?: string;
    };

    weddingChallenges?: {
      enabled: boolean;
      price: number;
      givenFree?: boolean;
      notes?: string;
    };

    weddingChallengesGiveaway?: {
      enabled: boolean;
      price: number;
      givenFree?: boolean;
      notes?: string;
    };
  };

  /**
   * סכומי חיוב/תשלום:
   * totalDealAmount = שווי עסקה מלא כולל מע״מ/תוספות לפי מה שסגרת עם הלקוח
   * paidAmount = כמה כסף נכנס בפועל עד עכשיו
   * remainingAmount = יתרה לתשלום
   * paymentMode = מלא / מקדמה / ידני / חינם
   */
  totalDealAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMode: "full" | "deposit" | "manual" | "free" | "none";
  paidAt?: Date | null;
  lastPaymentAt?: Date | null;

  payments?: {
    amount: number;
    type: "full" | "deposit" | "balance" | "manual" | "refund" | "other";
    method?: "stripe" | "cash" | "bank_transfer" | "bit" | "paybox" | "manual" | "other";
    status: "paid" | "pending" | "failed" | "refunded" | "cancelled";
    paidAt?: Date | null;
    note?: string;
    createdBy?: mongoose.Types.ObjectId | null;
    createdAt?: Date;
  }[];

  hasPaid: boolean;
  isActive: boolean;

  eventDate?: Date | null;

  producerId?: mongoose.Types.ObjectId | null;
  createdByProducer?: mongoose.Types.ObjectId | null;
  createdByAdmin?: boolean;

  assignedProducerId?: mongoose.Types.ObjectId | null;
  assignedProducerIds?: mongoose.Types.ObjectId[];
  assignedStaffIds?: mongoose.Types.ObjectId[];
  assignedClientIds?: mongoose.Types.ObjectId[];

    billingSource?: "site" | "admin" | "producer" | "pricing" | "venue";
  producerPricePerRecord?: number;

  // לקוח שנוצר דרך אולם
  venueClientSource?: boolean;
  venueOwnerId?: mongoose.Types.ObjectId | null;

  /**
   * Venue system user (login for a hall) — NOT Invistimo Staff.
   * Access is always via VenueMembership, never via staffType.
   */
  venueUser?: boolean;
  mustChangePassword?: boolean;
  authVersion?: number;

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
  includeTransportationManagement: boolean;
  includeWeddingChallenges: boolean;
  weddingChallengesOnly?: boolean;

  /**
   * סוג אתר לאורחים.
   * standard — קישור אישי לכל אורח (ברירת מחדל, לקוחות קיימים)
   * personal — אתר חתונה אישי
   */
  rsvpSiteMode?: "standard" | "personal";

  /**
   * חוויית אורח המפורשת.
   * personal_invitation — ברירת מחדל, לקוחות קיימים
   * wedding_website — רק אם נבחר במפורש
   */
  guestExperienceType?: "personal_invitation" | "wedding_website";

  features?: {
    weddingWebsite?: boolean;
    guestMessages?: boolean;
  };

  accessModules?: {
    rsvpSeating: boolean;
    eventProduction: boolean;
    transportationManagement?: boolean;
    weddingChallenges?: boolean;

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
    transportationEnabled?: boolean;
    weddingChallengesEnabled?: boolean;
  };

  smsBalance: number;
  smsUsed: number;
  testSmsUsed: number;

  whatsappBalance: number;
  whatsappUsed: number;

  isTrial: boolean;

  isDemoUser?: boolean;
  needsPasswordSetup?: boolean;
  requireAgreementBeforePassword?: boolean;
  onboardingAgreementToken?: string;
  onboardingAgreementSignedAt?: Date | null;
  termsAcceptedAt?: Date | null;

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
      enum: ["producer_staff", "general_staff", "seating_staff", "usher_staff"],
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

      eventDayManager: {
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


preRsvpMessages: {
  enabled: {
    type: Boolean,
    default: false,
    index: true,
  },

  mode: {
    type: String,
    enum: ["none", "save_the_date_only", "invitation_only", "both"],
    default: "none",
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

  sentCount: {
    type: Number,
    default: 0,
    min: 0,
  },

  sentAt: {
    type: Date,
    default: null,
    index: true,
  },

  saveTheDateEnabled: {
    type: Boolean,
    default: false,
    index: true,
  },

  invitationOnlyEnabled: {
    type: Boolean,
    default: false,
    index: true,
  },

  saveTheDateSentCount: {
    type: Number,
    default: 0,
    min: 0,
  },

  saveTheDateSentAt: {
    type: Date,
    default: null,
    index: true,
  },

  invitationOnlySentCount: {
    type: Number,
    default: 0,
    min: 0,
  },

  invitationOnlySentAt: {
    type: Date,
    default: null,
    index: true,
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

      transportationManagement: {
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

      weddingChallenges: {
        enabled: {
          type: Boolean,
          default: false,
          index: true,
        },

        price: {
          type: Number,
          default: 299,
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

      weddingChallengesGiveaway: {
        enabled: {
          type: Boolean,
          default: false,
          index: true,
        },

        price: {
          type: Number,
          default: 99,
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
    },

    /**
     * שווי העסקה המלאה.
     * לדוגמה: אם סגרת עסקה על 2,299 ₪ — זה השדה שיחזיק 2299.
     * לא משתמשים בו כהכנסה חודשית, אלא רק להצגת שווי עסקה/יתרה.
     */
    totalDealAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * כמה כסף נכנס בפועל עד עכשיו.
     * אם הלקוח שילם רק מקדמה — כאן שומרים רק את המקדמה.
     * הדשבורד הכנסות צריך להסתמך על paidAmount ולא על totalDealAmount.
     */
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    /**
     * יתרה לתשלום.
     * מחושב אוטומטית ב-hook לפי totalDealAmount - paidAmount.
     */
    remainingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * סוג התשלום בפועל.
     * deposit = מקדמה בלבד
     * full = שולם מלא
     * manual = עודכן ידנית
     * free = ללא תשלום
     * none = לא שולם
     */
    paymentMode: {
      type: String,
      enum: ["full", "deposit", "manual", "free", "none"],
      default: "none",
      index: true,
    },

    paidAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastPaymentAt: {
      type: Date,
      default: null,
      index: true,
    },

    /**
     * היסטוריית תשלומים בפועל.
     * מאפשרת שמקדמה תיספר בחודש אחד, ויתרה בחודש אחר.
     */
    payments: [
      {
        amount: {
          type: Number,
          default: 0,
          min: 0,
        },

        type: {
          type: String,
          enum: ["full", "deposit", "balance", "manual", "refund", "other"],
          default: "manual",
        },

        method: {
          type: String,
          enum: [
            "stripe",
            "cash",
            "bank_transfer",
            "bit",
            "paybox",
            "manual",
            "other",
          ],
          default: "manual",
        },

        status: {
          type: String,
          enum: ["paid", "pending", "failed", "refunded", "cancelled"],
          default: "paid",
          index: true,
        },

        paidAt: {
          type: Date,
          default: Date.now,
          index: true,
        },

        note: {
          type: String,
          trim: true,
          default: "",
        },

        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    hasPaid: {
      type: Boolean,
      default: false,
      index: true,
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

    assignedProducerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

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

    includeTransportationManagement: {
      type: Boolean,
      default: false,
      index: true,
    },

    includeWeddingChallenges: {
      type: Boolean,
      default: false,
      index: true,
    },

    weddingChallengesOnly: {
      type: Boolean,
      default: false,
      index: true,
    },

    rsvpSiteMode: {
      type: String,
      enum: ["standard", "personal"],
      default: "standard",
      index: true,
    },

    guestExperienceType: {
      type: String,
      enum: ["personal_invitation", "wedding_website"],
      default: "personal_invitation",
      index: true,
    },

    features: {
      weddingWebsite: {
        type: Boolean,
        default: false,
        index: true,
      },
      guestMessages: {
        type: Boolean,
        default: false,
        index: true,
      },
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

      transportationManagement: {
        type: Boolean,
        default: false,
        index: true,
      },

      weddingChallenges: {
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

      transportationEnabled: {
        type: Boolean,
        default: false,
      },

      weddingChallengesEnabled: {
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

    requireAgreementBeforePassword: {
      type: Boolean,
      default: false,
    },

    onboardingAgreementToken: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    onboardingAgreementSignedAt: {
      type: Date,
      default: null,
    },

    termsAcceptedAt: {
      type: Date,
      default: null,
      index: true,
    },

    /**
     * Venue tenant login user (hall employee with system access).
     * Must never set staffType / Invistimo staff portals.
     */
    venueUser: {
      type: Boolean,
      default: false,
      index: true,
    },

    mustChangePassword: {
      type: Boolean,
      default: false,
    },

    authVersion: {
      type: Number,
      default: 0,
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

  const currentPreRsvpModeRaw = String(
    currentSalesUpsells.preRsvpMessages?.mode || ""
  );

  const currentPreRsvpMode = ([
    "none",
    "save_the_date_only",
    "invitation_only",
    "both",
  ].includes(currentPreRsvpModeRaw)
    ? currentPreRsvpModeRaw
    : currentSalesUpsells.preRsvpMessages?.enabled
      ? "both"
      : "none") as
    | "none"
    | "save_the_date_only"
    | "invitation_only"
    | "both";

  const preRsvpSaveTheDateEnabled = Boolean(
    currentSalesUpsells.preRsvpMessages?.saveTheDateEnabled ||
      currentPreRsvpMode === "save_the_date_only" ||
      currentPreRsvpMode === "both"
  );

  const preRsvpInvitationOnlyEnabled = Boolean(
    currentSalesUpsells.preRsvpMessages?.invitationOnlyEnabled ||
      currentPreRsvpMode === "invitation_only" ||
      currentPreRsvpMode === "both"
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

    eventDayManager: {
      enabled: Boolean(currentSalesUpsells.eventDayManager?.enabled),
      price: Number(currentSalesUpsells.eventDayManager?.price || 0),
      givenFree: Boolean(currentSalesUpsells.eventDayManager?.givenFree),
      notes: String(currentSalesUpsells.eventDayManager?.notes || ""),
    },

    thirdRsvpRound: {
      enabled: existingThirdRsvpRoundEnabled,
      price: Number(currentSalesUpsells.thirdRsvpRound?.price || 0),
      givenFree: Boolean(currentSalesUpsells.thirdRsvpRound?.givenFree),
      notes: String(currentSalesUpsells.thirdRsvpRound?.notes || ""),
    },

    preRsvpMessages: {
      enabled: Boolean(currentSalesUpsells.preRsvpMessages?.enabled),
      mode: currentPreRsvpMode,
      price: Number(currentSalesUpsells.preRsvpMessages?.price || 0),
      givenFree: Boolean(currentSalesUpsells.preRsvpMessages?.givenFree),
      notes: String(currentSalesUpsells.preRsvpMessages?.notes || ""),
      sentCount: Number(currentSalesUpsells.preRsvpMessages?.sentCount || 0),
      sentAt: currentSalesUpsells.preRsvpMessages?.sentAt || null,
      saveTheDateEnabled: preRsvpSaveTheDateEnabled,
      invitationOnlyEnabled: preRsvpInvitationOnlyEnabled,
      saveTheDateSentCount: Number(
        currentSalesUpsells.preRsvpMessages?.saveTheDateSentCount || 0
      ),
      saveTheDateSentAt:
        currentSalesUpsells.preRsvpMessages?.saveTheDateSentAt || null,
      invitationOnlySentCount: Number(
        currentSalesUpsells.preRsvpMessages?.invitationOnlySentCount || 0
      ),
      invitationOnlySentAt:
        currentSalesUpsells.preRsvpMessages?.invitationOnlySentAt || null,
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

    transportationManagement: {
      enabled: Boolean(
        currentSalesUpsells.transportationManagement?.enabled ||
          doc.includeTransportationManagement
      ),
      price: Number(currentSalesUpsells.transportationManagement?.price || 0),
      givenFree: Boolean(
        currentSalesUpsells.transportationManagement?.givenFree
      ),
      notes: String(currentSalesUpsells.transportationManagement?.notes || ""),
    },

    weddingChallenges: {
      enabled: Boolean(
        currentSalesUpsells.weddingChallenges?.enabled ||
          doc.includeWeddingChallenges
      ),
      price: Number(currentSalesUpsells.weddingChallenges?.price || 299),
      givenFree: Boolean(currentSalesUpsells.weddingChallenges?.givenFree),
      notes: String(currentSalesUpsells.weddingChallenges?.notes || ""),
    },

    weddingChallengesGiveaway: {
      enabled: Boolean(currentSalesUpsells.weddingChallengesGiveaway?.enabled),
      price: Number(currentSalesUpsells.weddingChallengesGiveaway?.price || 99),
      givenFree: Boolean(
        currentSalesUpsells.weddingChallengesGiveaway?.givenFree
      ),
      notes: String(currentSalesUpsells.weddingChallengesGiveaway?.notes || ""),
    },
  };

  if (doc.salesUpsells.digitalSeating?.enabled) {
    doc.includeDigitalSeating = true;
  }

  if (doc.salesUpsells.transportationManagement?.enabled) {
    doc.includeTransportationManagement = true;
  }

  if (doc.salesUpsells.weddingChallenges?.enabled) {
    doc.includeWeddingChallenges = true;
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

  if (doc.includeTransportationManagement) {
    doc.planLimits = {
      ...(doc.planLimits || {}),
      transportationEnabled: true,
    };
  }

  if (doc.includeWeddingChallenges) {
    doc.planLimits = {
      ...(doc.planLimits || {}),
      weddingChallengesEnabled: true,
    };
  }

  /*
    הרשאות מודולים:
    rsvpSeating = אישורי הגעה / הושבה
    eventProduction = הפקת אירוע
    transportationManagement = ניהול הסעות
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

    transportationManagement: Boolean(
      doc.accessModules?.transportationManagement ||
        doc.includeTransportationManagement ||
        doc.salesUpsells?.transportationManagement?.enabled
    ),

    weddingChallenges: Boolean(
      doc.accessModules?.weddingChallenges ||
        doc.includeWeddingChallenges ||
        doc.salesUpsells?.weddingChallenges?.enabled
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

  /*
    חישוב תשלום בפועל:
    totalDealAmount = סכום עסקה מלא
    paidAmount = רק מה ששולם בפועל
    remainingAmount = יתרה

    אם קיימת היסטוריית payments, paidAmount מחושב מסכום התשלומים בסטטוס paid
    פחות refunds. כך מקדמה נספרת לבד, ותשלום יתרה בהמשך יכול להיספר בנפרד.
  */
  const totalDealAmount = Math.max(0, Number(doc.totalDealAmount || 0));

  const paymentsList = Array.isArray(doc.payments) ? doc.payments : [];

  if (paymentsList.length > 0) {
    const paidFromPayments = paymentsList.reduce((sum, payment: any) => {
      const amount = Math.max(0, Number(payment?.amount || 0));
      const status = String(payment?.status || "").toLowerCase();
      const type = String(payment?.type || "").toLowerCase();

      if (status !== "paid") return sum;
      if (type === "refund") return sum - amount;

      return sum + amount;
    }, 0);

    doc.paidAmount = Math.max(0, paidFromPayments);

    const latestPaidPayment = [...paymentsList]
      .filter((payment: any) => String(payment?.status || "").toLowerCase() === "paid")
      .sort((a: any, b: any) => {
        return (
          new Date(b?.paidAt || b?.createdAt || 0).getTime() -
          new Date(a?.paidAt || a?.createdAt || 0).getTime()
        );
      })[0];

    if (latestPaidPayment?.paidAt || latestPaidPayment?.createdAt) {
      doc.lastPaymentAt = latestPaidPayment.paidAt || latestPaidPayment.createdAt;
      doc.paidAt = doc.paidAt || doc.lastPaymentAt;
    }
  } else {
    doc.paidAmount = Math.max(0, Number(doc.paidAmount || 0));
  }

  doc.totalDealAmount = totalDealAmount;
  doc.remainingAmount = Math.max(0, totalDealAmount - Number(doc.paidAmount || 0));
  doc.hasPaid = Number(doc.paidAmount || 0) > 0;

  if (doc.hasPaid && !doc.paidAt) {
    doc.paidAt = doc.lastPaymentAt || new Date();
  }

  if (!doc.hasPaid) {
    doc.paymentMode = doc.paymentMode === "free" ? "free" : "none";
  } else if (totalDealAmount > 0 && Number(doc.paidAmount || 0) >= totalDealAmount) {
    doc.paymentMode = "full";
  } else if (totalDealAmount > 0 && Number(doc.paidAmount || 0) < totalDealAmount) {
    doc.paymentMode = "deposit";
  } else if (!doc.paymentMode || doc.paymentMode === "none") {
    doc.paymentMode = "manual";
  }

 if (doc.role === "admin") {
  doc.staffType = null;
  doc.employeeScope = null;
  doc.assignedProducerId = null;
  doc.assignedProducerIds = [];
  doc.assignedClientIds = [];
}

if (
  doc.role === "user" ||
  doc.role === "client" ||
  doc.role === "producer" ||
  doc.role === "venue_owner"
) {
  // Venue login users keep employeeScope="venue" and never get Invistimo staffType.
  // Regular clients/producers/owners stay outside Invistimo Staff portals.
  doc.staffType = null;
  if (doc.role === "user" && doc.venueUser) {
    doc.employeeScope = "venue";
  } else {
    doc.employeeScope = null;
  }
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
  עובד הושבה:
  role = staff
  staffType = seating_staff
  employeeScope = system

  חשוב:
  עובד הושבה מקבל אותה כניסה כמו עובד מערכת,
  אבל בפועל צריך לסנן אותו לפי assignedClientIds
  בקבצי ה-API של לקוחות/התחזות/דשבורד עובד.
*/
if (doc.role === "staff" && doc.staffType === "seating_staff") {
  doc.employeeScope = "system";
}

/*
  דייל / דיילת אירוע:
  role = staff
  staffType = usher_staff
  employeeScope = system

  חשוב:
  זה נפרד מ-general_staff כדי שלא יקבל הרשאות של עובד כללי.
*/
if (doc.role === "staff" && doc.staffType === "usher_staff") {
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

  if (Array.isArray(doc.assignedProducerIds)) {
    doc.assignedProducerIds = Array.from(
      new Set(doc.assignedProducerIds.map(String))
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
UserSchema.index({ assignedProducerIds: 1, role: 1 });
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
UserSchema.index({ "salesUpsells.eventDayManager.enabled": 1 });
UserSchema.index({ "salesUpsells.thirdRsvpRound.enabled": 1 });
UserSchema.index({ "salesUpsells.preRsvpMessages.enabled": 1 });
UserSchema.index({ "salesUpsells.preRsvpMessages.mode": 1 });
UserSchema.index({ "salesUpsells.preRsvpMessages.sentAt": 1 });
UserSchema.index({ "salesUpsells.preRsvpMessages.saveTheDateSentAt": 1 });
UserSchema.index({ "salesUpsells.preRsvpMessages.invitationOnlySentAt": 1 });
UserSchema.index({ "salesUpsells.suppliersBudgetSystem.enabled": 1 });
UserSchema.index({ "salesUpsells.alcoholManagement.enabled": 1 });
UserSchema.index({ "salesUpsells.transportationManagement.enabled": 1 });
UserSchema.index({ "salesUpsells.weddingChallenges.enabled": 1 });
UserSchema.index({ "salesUpsells.weddingChallengesGiveaway.enabled": 1 });
UserSchema.index({ includeTransportationManagement: 1 });
UserSchema.index({ includeWeddingChallenges: 1 });

UserSchema.index({ hasPaid: 1, paidAmount: 1, paidAt: 1 });
UserSchema.index({ hasPaid: 1, paidAmount: 1, createdAt: 1 });
UserSchema.index({ "payments.status": 1, "payments.paidAt": 1 });
UserSchema.index({ paymentMode: 1, remainingAmount: 1 });

/* ============================================================
   MODEL
============================================================ */
const User = models.User || model<IUser>("User", UserSchema);

export default User;