import mongoose, { Schema, Types, type Model } from "mongoose";

/* ============================================================
   CallWorkOrder
   הוראת עבודה לשיחות וידוא הגעה
============================================================ */

export type CallWorkOrderType = "rsvp_calls";

export type CallWorkOrderRound = 1 | 2 | 3;

export type CallWorkOrderStatus =
  | "scheduled" // נוצרה / ממתינה לפתיחה
  | "open" // פתוחה לטיפול
  | "in_progress" // בטיפול
  | "completed" // הסתיימה
  | "cancelled" // בוטלה
  | "paused"; // הוקפאה

export type CallWorkOrderSourceAudience =
  | "pending_rsvp" // סבב 1 - כל מי שממתין / טרם השיב
  | "round_1_no_answer" // סבב 2 - מי שלא ענה בסבב 1
  | "round_2_no_answer"; // סבב 3 - מי שלא ענה בסבב 2

export type CallWorkOrderDistributionStrategy =
  | "scheduled_shift_round_robin" // חלוקה לפי עובדים שמשובצים למשמרת באותו יום
  | "manual"; // שינוי ידני של אדמין

export type CallWorkOrderCreatedBy = "system" | "admin";

export interface ICallWorkOrder {
  _id?: Types.ObjectId;

  type: CallWorkOrderType;

  invitationId: Types.ObjectId;

  /**
   * אופציונלי - קשר למשתמש/לקוח במערכת
   */
  userId?: Types.ObjectId | null;
  clientUserId?: Types.ObjectId | null;

  /**
   * Snapshot של פרטי הלקוח/אירוע בזמן פתיחת ההוראה
   */
  clientName: string;
  clientEmail: string;
  eventName: string;
  eventDate?: Date | null;

  /**
   * סבבי שיחות:
   * 1 = כל הממתינים
   * 2 = מי שלא ענה בסבב 1
   * 3 = מי שלא ענה בסבב 2
   */
  round: CallWorkOrderRound;
  sourceAudience: CallWorkOrderSourceAudience;

  /**
   * תאריך העבודה בפועל
   */
  workDate: Date;

  /**
   * התאריך/שעה שהוגדרו ללקוח בסבבי השיחות
   */
  configuredRoundAt?: Date | null;

  /**
   * מתי המערכת אמורה לפתוח את ההוראה אוטומטית
   * אצלך: כל יום ב־08:00
   */
  autoOpenAt: Date;
  autoOpenHour: number;
  timezone: string;

  title: string;
  description: string;

  status: CallWorkOrderStatus;

  /**
   * חלוקה לעובדים
   */
  distributionStrategy: CallWorkOrderDistributionStrategy;
  assignedEmployeeIds: Types.ObjectId[];
  assignedShiftIds: Types.ObjectId[];

  employeeCount: number;
  totalTasks: number;

  /**
   * סיכומים מתוך CallTask
   */
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  confirmedTasks: number;
  declinedTasks: number;
  noAnswerTasks: number;
  callbackTasks: number;
  wrongNumberTasks: number;
  unassignedTasks: number;

  createdBy: CallWorkOrderCreatedBy;
  createdByUserId?: Types.ObjectId | null;

  lastDistributedAt?: Date | null;
  lastReassignedAt?: Date | null;
  lastStatusSyncAt?: Date | null;

  completedAt?: Date | null;
  cancelledAt?: Date | null;
  cancelledReason?: string;

  notes?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const CallWorkOrderSchema = new Schema<ICallWorkOrder>(
  {
    type: {
      type: String,
      enum: ["rsvp_calls"],
      default: "rsvp_calls",
      required: true,
      index: true,
    },

    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    clientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    clientName: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    clientEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      index: true,
    },

    eventName: {
      type: String,
      trim: true,
      default: "",
    },

    eventDate: {
      type: Date,
      default: null,
      index: true,
    },

    round: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
      index: true,
    },

    sourceAudience: {
      type: String,
      enum: ["pending_rsvp", "round_1_no_answer", "round_2_no_answer"],
      required: true,
      index: true,
    },

    workDate: {
      type: Date,
      required: true,
      index: true,
    },

    configuredRoundAt: {
      type: Date,
      default: null,
      index: true,
    },

    autoOpenAt: {
      type: Date,
      required: true,
      index: true,
    },

    autoOpenHour: {
      type: Number,
      default: 8,
      min: 0,
      max: 23,
    },

    timezone: {
      type: String,
      default: "Asia/Jerusalem",
      trim: true,
    },

    title: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "scheduled",
        "open",
        "in_progress",
        "completed",
        "cancelled",
        "paused",
      ],
      default: "scheduled",
      required: true,
      index: true,
    },

    distributionStrategy: {
      type: String,
      enum: ["scheduled_shift_round_robin", "manual"],
      default: "scheduled_shift_round_robin",
      required: true,
    },

    assignedEmployeeIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        index: true,
      },
    ],

    assignedShiftIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "EmployeeShift",
        index: true,
      },
    ],

    employeeCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalTasks: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    pendingTasks: {
      type: Number,
      default: 0,
      min: 0,
    },

    inProgressTasks: {
      type: Number,
      default: 0,
      min: 0,
    },

    completedTasks: {
      type: Number,
      default: 0,
      min: 0,
    },

    confirmedTasks: {
      type: Number,
      default: 0,
      min: 0,
    },

    declinedTasks: {
      type: Number,
      default: 0,
      min: 0,
    },

    noAnswerTasks: {
      type: Number,
      default: 0,
      min: 0,
    },

    callbackTasks: {
      type: Number,
      default: 0,
      min: 0,
    },

    wrongNumberTasks: {
      type: Number,
      default: 0,
      min: 0,
    },

    unassignedTasks: {
      type: Number,
      default: 0,
      min: 0,
    },

    createdBy: {
      type: String,
      enum: ["system", "admin"],
      default: "system",
      required: true,
      index: true,
    },

    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    lastDistributedAt: {
      type: Date,
      default: null,
    },

    lastReassignedAt: {
      type: Date,
      default: null,
    },

    lastStatusSyncAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledReason: {
      type: String,
      trim: true,
      default: "",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

/* ============================================================
   Helpers
============================================================ */

function getSourceAudienceByRound(
  round: CallWorkOrderRound
): CallWorkOrderSourceAudience {
  if (round === 1) return "pending_rsvp";
  if (round === 2) return "round_1_no_answer";
  return "round_2_no_answer";
}

function getDescriptionByRound(round: CallWorkOrderRound) {
  if (round === 1) {
    return "סבב 1 - שיחות לכל האורחים שטרם השיבו";
  }

  if (round === 2) {
    return "סבב 2 - שיחות למי שלא ענה בסבב הראשון";
  }

  return "סבב 3 - שיחות למי שלא ענה בסבב השני";
}

/* ============================================================
   Auto defaults
============================================================ */

CallWorkOrderSchema.pre("validate", function () {
  const doc = this as ICallWorkOrder;

  if (!doc.type) {
    doc.type = "rsvp_calls";
  }

  if (!doc.sourceAudience && doc.round) {
    doc.sourceAudience = getSourceAudienceByRound(doc.round);
  }

  if (!doc.title) {
    const name = doc.clientName || "לקוח";
    doc.title = `${name} | סבב ${doc.round} שיחות`;
  }

  if (!doc.description && doc.round) {
    doc.description = getDescriptionByRound(doc.round);
  }

  if (!doc.timezone) {
    doc.timezone = "Asia/Jerusalem";
  }

  if (!doc.autoOpenHour && doc.autoOpenHour !== 0) {
    doc.autoOpenHour = 8;
  }

  /**
   * fallback לפתיחה ב־08:00 לפי workDate.
   * בשלב ה־API נחשב מדויק יותר לפי Asia/Jerusalem.
   */
  if (!doc.autoOpenAt && doc.workDate) {
    const d = new Date(doc.workDate);
    d.setHours(doc.autoOpenHour, 0, 0, 0);
    doc.autoOpenAt = d;
  }

  if (!Array.isArray(doc.assignedEmployeeIds)) {
    doc.assignedEmployeeIds = [];
  }

  if (!Array.isArray(doc.assignedShiftIds)) {
    doc.assignedShiftIds = [];
  }

  doc.employeeCount = doc.assignedEmployeeIds.length;
});

/* ============================================================
   Indexes
============================================================ */

/**
 * מונע כפילות:
 * לא לפתוח פעמיים אותה הוראת עבודה
 * לאותו אירוע, אותו סבב, אותו תאריך עבודה.
 */
CallWorkOrderSchema.index(
  {
    invitationId: 1,
    type: 1,
    round: 1,
    workDate: 1,
  },
  {
    unique: true,
    name: "unique_call_work_order_invitation_round_date",
  }
);

CallWorkOrderSchema.index({
  status: 1,
  autoOpenAt: 1,
});

CallWorkOrderSchema.index({
  workDate: 1,
  status: 1,
});

CallWorkOrderSchema.index({
  assignedEmployeeIds: 1,
  workDate: 1,
  status: 1,
});

CallWorkOrderSchema.index({
  invitationId: 1,
  status: 1,
  round: 1,
});

CallWorkOrderSchema.index({
  clientEmail: 1,
  workDate: 1,
});

/* ============================================================
   Virtuals
============================================================ */

CallWorkOrderSchema.virtual("remainingTasks").get(function () {
  const doc = this as ICallWorkOrder;

  const total = Number(doc.totalTasks || 0);
  const completed = Number(doc.completedTasks || 0);

  return Math.max(0, total - completed);
});

CallWorkOrderSchema.virtual("progressPercent").get(function () {
  const doc = this as ICallWorkOrder;

  const total = Number(doc.totalTasks || 0);
  const completed = Number(doc.completedTasks || 0);

  if (total <= 0) return 0;

  return Math.round((completed / total) * 100);
});

/* ============================================================
   Export
============================================================ */

const CallWorkOrderModel =
  (mongoose.models.CallWorkOrder as Model<ICallWorkOrder> | undefined) ||
  mongoose.model<ICallWorkOrder>("CallWorkOrder", CallWorkOrderSchema);

export default CallWorkOrderModel;