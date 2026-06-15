import mongoose, { Schema, Types, type Model } from "mongoose";

/* ============================================================
   CallTask
   משימת שיחה ספציפית לאורח בתוך הוראת עבודה
============================================================ */

export type CallTaskType = "rsvp_call";

export type CallTaskRound = 1 | 2 | 3;

export type CallTaskStatus =
  | "pending" // ממתין לטיפול
  | "in_progress" // העובד התחיל טיפול / שיחה
  | "confirmed" // אישר הגעה
  | "declined" // לא מגיע
  | "no_answer" // לא ענה
  | "callback" // לחזור אליו
  | "wrong_number" // מספר שגוי
  | "completed" // הושלם כללי
  | "cancelled"; // בוטל

export type CallTaskSourceAudience =
  | "pending_rsvp" // סבב 1 - כל מי שטרם השיב
  | "round_1_no_answer" // סבב 2 - מי שלא ענה בסבב 1
  | "round_2_no_answer"; // סבב 3 - מי שלא ענה בסבב 2

export type CallTaskResult =
  | "confirmed"
  | "declined"
  | "no_answer"
  | "callback"
  | "wrong_number"
  | "other";

export interface ICallTask {
  _id?: Types.ObjectId;

  type: CallTaskType;

  /**
   * הוראת העבודה הכללית
   */
  workOrderId: Types.ObjectId;

  /**
   * האירוע / ההזמנה
   */
  invitationId: Types.ObjectId;

  /**
   * האורח המקורי מתוך InvitationGuest
   */
  guestId: Types.ObjectId;

  /**
   * העובד שאליו הוקצתה המשימה
   */
  assignedToEmployeeId?: Types.ObjectId | null;

  /**
   * אם המשימה הועברה מעובד לעובד
   */
  previousAssignedEmployeeId?: Types.ObjectId | null;

  /**
   * פרטי לקוח / אירוע Snapshot
   */
  clientName: string;
  clientEmail: string;
  eventName: string;
  eventDate?: Date | null;

  /**
   * פרטי אורח Snapshot
   */
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestGroup?: string;
  guestSide?: string;
  guestTable?: string;
  guestNotes?: string;

  /**
   * סבב שיחות
   */
  round: CallTaskRound;
  sourceAudience: CallTaskSourceAudience;

  /**
   * תאריך העבודה בפועל
   */
  workDate: Date;

  /**
   * סטטוס המשימה
   */
  status: CallTaskStatus;
  result?: CallTaskResult | null;

  /**
   * ניהול עבודה
   */
  priority: number;
  sortOrder: number;

  assignedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  lastAttemptAt?: Date | null;

  /**
   * ספירת ניסיונות בתוך אותה משימה
   */
  attemptsCount: number;

  /**
   * תיעוד העברה ידנית
   */
  reassignedAt?: Date | null;
  reassignedByUserId?: Types.ObjectId | null;
  reassignedReason?: string;

  /**
   * תשובה בפועל לאירוע
   */
  rsvpStatus?: string;
  attendingCount?: number | null;

  /**
   * הערת עובד
   */
  note?: string;

  /**
   * הערת אדמין פנימית
   */
  adminNote?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

const CallTaskSchema = new Schema<ICallTask>(
  {
    type: {
      type: String,
      enum: ["rsvp_call"],
      default: "rsvp_call",
      required: true,
      index: true,
    },

    workOrderId: {
      type: Schema.Types.ObjectId,
      ref: "CallWorkOrder",
      required: true,
      index: true,
    },

    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
      index: true,
    },

    guestId: {
      type: Schema.Types.ObjectId,
      ref: "InvitationGuest",
      required: true,
      index: true,
    },

    assignedToEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    previousAssignedEmployeeId: {
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

    guestName: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    guestPhone: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    guestEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    guestGroup: {
      type: String,
      trim: true,
      default: "",
    },

    guestSide: {
      type: String,
      trim: true,
      default: "",
    },

    guestTable: {
      type: String,
      trim: true,
      default: "",
    },

    guestNotes: {
      type: String,
      trim: true,
      default: "",
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

    status: {
      type: String,
      enum: [
        "pending",
        "in_progress",
        "confirmed",
        "declined",
        "no_answer",
        "callback",
        "wrong_number",
        "completed",
        "cancelled",
      ],
      default: "pending",
      required: true,
      index: true,
    },

    result: {
      type: String,
      enum: [
        "confirmed",
        "declined",
        "no_answer",
        "callback",
        "wrong_number",
        "other",
        null,
      ],
      default: null,
      index: true,
    },

    priority: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    assignedAt: {
      type: Date,
      default: null,
      index: true,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    attemptsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    reassignedAt: {
      type: Date,
      default: null,
    },

    reassignedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    reassignedReason: {
      type: String,
      trim: true,
      default: "",
    },

    rsvpStatus: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    attendingCount: {
      type: Number,
      default: null,
      min: 0,
    },

    note: {
      type: String,
      trim: true,
      default: "",
    },

    adminNote: {
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

function getSourceAudienceByRound(round: CallTaskRound): CallTaskSourceAudience {
  if (round === 1) return "pending_rsvp";
  if (round === 2) return "round_1_no_answer";
  return "round_2_no_answer";
}

function isCompletedStatus(status: CallTaskStatus) {
  return [
    "confirmed",
    "declined",
    "no_answer",
    "callback",
    "wrong_number",
    "completed",
    "cancelled",
  ].includes(status);
}

/* ============================================================
   Auto defaults
============================================================ */

CallTaskSchema.pre("validate", function () {
  const doc = this as ICallTask;

  if (!doc.type) {
    doc.type = "rsvp_call";
  }

  if (!doc.sourceAudience && doc.round) {
    doc.sourceAudience = getSourceAudienceByRound(doc.round);
  }

  if (!doc.status) {
    doc.status = "pending";
  }

  if (!doc.result && isCompletedStatus(doc.status)) {
    if (doc.status === "confirmed") doc.result = "confirmed";
    else if (doc.status === "declined") doc.result = "declined";
    else if (doc.status === "no_answer") doc.result = "no_answer";
    else if (doc.status === "callback") doc.result = "callback";
    else if (doc.status === "wrong_number") doc.result = "wrong_number";
    else doc.result = "other";
  }

  if (doc.assignedToEmployeeId && !doc.assignedAt) {
    doc.assignedAt = new Date();
  }

  if (isCompletedStatus(doc.status) && !doc.completedAt) {
    doc.completedAt = new Date();
  }
});

/* ============================================================
   Indexes
============================================================ */

/**
 * מונע כפילות:
 * אותו אורח לא ייכנס פעמיים לאותה הוראת עבודה.
 */
CallTaskSchema.index(
  {
    workOrderId: 1,
    guestId: 1,
  },
  {
    unique: true,
    name: "unique_call_task_work_order_guest",
  }
);

/**
 * מונע כפילות לפי אירוע + אורח + סבב + תאריך עבודה.
 */
CallTaskSchema.index(
  {
    invitationId: 1,
    guestId: 1,
    round: 1,
    workDate: 1,
  },
  {
    unique: true,
    name: "unique_call_task_invitation_guest_round_date",
  }
);

CallTaskSchema.index({
  assignedToEmployeeId: 1,
  workDate: 1,
  status: 1,
});

CallTaskSchema.index({
  assignedToEmployeeId: 1,
  workOrderId: 1,
  status: 1,
});

CallTaskSchema.index({
  workOrderId: 1,
  status: 1,
});

CallTaskSchema.index({
  invitationId: 1,
  round: 1,
  status: 1,
});

CallTaskSchema.index({
  sourceAudience: 1,
  status: 1,
});

CallTaskSchema.index({
  guestPhone: 1,
});

CallTaskSchema.index({
  workDate: 1,
  status: 1,
});

/* ============================================================
   Virtuals
============================================================ */

CallTaskSchema.virtual("isAssigned").get(function () {
  const doc = this as ICallTask;
  return Boolean(doc.assignedToEmployeeId);
});

CallTaskSchema.virtual("isCompleted").get(function () {
  const doc = this as ICallTask;
  return isCompletedStatus(doc.status);
});

CallTaskSchema.virtual("canReassign").get(function () {
  const doc = this as ICallTask;

  return ["pending", "in_progress", "no_answer", "callback"].includes(
    doc.status
  );
});

/* ============================================================
   Export
============================================================ */

const CallTaskModel =
  (mongoose.models.CallTask as Model<ICallTask> | undefined) ||
  mongoose.model<ICallTask>("CallTask", CallTaskSchema);

export default CallTaskModel;