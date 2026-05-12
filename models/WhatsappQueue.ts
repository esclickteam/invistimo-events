import mongoose, { Schema, models, model } from "mongoose";

/**
 * WhatsappQueue
 * תור מרכזי לשליחת הודעות WhatsApp.
 *
 * חשוב:
 * - ScheduledMessage הוא מקור האמת של התזמון.
 * - WhatsappQueue הוא תור השליחה בפועל.
 * - בסבבי RSVP מתוזמנים עדיף ליצור רשומות Queue רק בזמן שה-worker רץ,
 *   כדי שסבב 2/3 יישלחו לפי מי שעדיין pending ברגע השליחה בפועל.
 */

/* ================= TYPES ================= */

export type WhatsappQueueStatus =
  | "pending"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

export type WhatsappQueueType =
  | "rsvp"
  | "reminder"
  | "thankyou"
  | "table"
  | "custom";

export type WhatsappRoundNumber = 1 | 2 | 3;

/* ================= SCHEMA ================= */

const WhatsappQueueSchema = new Schema(
  {
    /* ================= RELATIONS ================= */

    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      index: true,
      default: null,
    },

    guestId: {
      type: Schema.Types.ObjectId,
      ref: "InvitationGuest",
      index: true,
      default: null,
    },

    /**
     * קישור לתזמון שממנו נוצרה השליחה.
     * רלוונטי לשליחות מתוזמנות.
     */
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: "ScheduledMessage",
      index: true,
      default: null,
    },

    /* ================= MESSAGE META ================= */

    channel: {
      type: String,
      enum: ["whatsapp"],
      default: "whatsapp",
      index: true,
    },

    type: {
      type: String,
      enum: ["rsvp", "reminder", "thankyou", "table", "custom"],
      default: "rsvp",
      index: true,
    },

    /**
     * round וגם roundNumber נשמרים במקביל כדי לא לשבור קוד קיים/חדש.
     * RSVP:
     * round 1 = כולם
     * round 2 = pending בזמן השליחה
     * round 3 = pending בזמן השליחה
     */
    round: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
      index: true,
    },

    roundNumber: {
      type: Number,
      enum: [1, 2, 3],
      default: 1,
      index: true,
    },

    /* ================= TARGET ================= */

    phone: {
      type: String,
      required: true,
      index: true,
    },

    templateName: {
      type: String,
      required: true,
      index: true,
    },

    /**
     * מזהה ייחודי אמיתי למניעת כפילות של אותה הודעה לאותו אורח.
     *
     * דוגמה מומלצת:
     * whatsapp:rsvp:{invitationId}:{round}:{guestId}:{scheduleId}
     *
     * כל שליחה בפועל היא ישות נפרדת.
     */
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /* ================= PROVIDER ================= */

    wamid: {
      type: String,
      default: null,
      index: true,
    },

    /**
     * סטטוס שמגיע ממטא:
     * sent / delivered / read / failed
     *
     * לא מחליף את status הפנימי שלנו.
     */
    providerStatus: {
      type: String,
      default: "",
      index: true,
    },

    /* ================= LOCKING ================= */

    lockedAt: {
      type: Date,
      default: null,
      index: true,
    },

    lockedBy: {
      type: String,
      default: null,
      index: true,
    },

    /* ================= SCHEDULING ================= */

    /**
     * אם הרשומה נוצרה מראש כ-scheduled.
     * אבל בלוגיקה המומלצת:
     * ScheduledMessage שומר את התזמון,
     * וה-Queue נוצר רק כשהגיע זמן השליחה.
     */
    scheduledAt: {
      type: Date,
      default: null,
      index: true,
    },

    /* ================= PAYLOAD ================= */

    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },

    /* ================= STATUS ================= */

    /**
     * חשוב:
     * לא להוסיף delivered/read ל-enum הזה.
     * delivered/read נשמרים ב-providerStatus + deliveredAt/readAt.
     */
    status: {
      type: String,
      enum: ["pending", "scheduled", "sending", "sent", "failed", "cancelled"],
      default: "pending",
      index: true,
    },

    /* ================= RETRIES ================= */

    attempts: {
      type: Number,
      default: 0,
    },

    maxAttempts: {
      type: Number,
      default: 3,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastError: {
      type: String,
      default: null,
    },

    errorCode: {
      type: String,
      default: null,
      index: true,
    },

    errorMessage: {
      type: String,
      default: null,
    },

    failReason: {
      code: { type: String, default: null },
      message: { type: String, default: null },
      raw: { type: Schema.Types.Mixed, default: null },
    },

    /* ================= TRACKING ================= */

    sentAt: {
      type: Date,
      default: null,
      index: true,
    },

    deliveredAt: {
      type: Date,
      default: null,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
      index: true,
    },

    failedAt: {
      type: Date,
      default: null,
      index: true,
    },

    cancelledAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ================= PRE VALIDATE ================= */

WhatsappQueueSchema.pre("validate", function () {
  const doc = this as any;

  const round = Number(doc.round ?? doc.roundNumber);

  if (round === 2) {
    doc.round = 2;
    doc.roundNumber = 2;
  } else if (round === 3) {
    doc.round = 3;
    doc.roundNumber = 3;
  } else {
    doc.round = 1;
    doc.roundNumber = 1;
  }

  doc.channel = "whatsapp";

  if (!doc.type) {
    doc.type = "rsvp";
  }

  if (typeof doc.phone === "string") {
    doc.phone = doc.phone.trim();
  }

  if (typeof doc.templateName === "string") {
    doc.templateName = doc.templateName.trim();
  }

  if (typeof doc.providerStatus === "string") {
    doc.providerStatus = doc.providerStatus.trim();
  }

  if (typeof doc.errorCode === "string") {
    doc.errorCode = doc.errorCode.trim();
  }

  if (typeof doc.errorMessage === "string") {
    doc.errorMessage = doc.errorMessage.trim();
  }

  if (doc.status !== "sent") {
    doc.sentAt = doc.sentAt ?? null;
  }

  if (doc.providerStatus !== "delivered") {
    doc.deliveredAt = doc.deliveredAt ?? null;
  }

  if (doc.providerStatus !== "read") {
    doc.readAt = doc.readAt ?? null;
  }

  if (doc.status !== "failed") {
    doc.failedAt = doc.failedAt ?? null;
  }

  if (doc.status !== "cancelled") {
    doc.cancelledAt = doc.cancelledAt ?? null;
  }

  if (doc.status !== "sending") {
    doc.lockedAt = doc.lockedAt ?? null;
    doc.lockedBy = doc.lockedBy ?? null;
  }
});

/* ================= INDEXES ================= */

// Polling יעיל ל-worker
WhatsappQueueSchema.index({
  status: 1,
  scheduledAt: 1,
  createdAt: 1,
});

// Worker לפי תור רגיל
WhatsappQueueSchema.index({
  status: 1,
  lockedAt: 1,
  attempts: 1,
  createdAt: 1,
});

// שחרור jobs תקועים
WhatsappQueueSchema.index({
  status: 1,
  lockedAt: 1,
});

// סטטיסטיקות לפי הזמנה
WhatsappQueueSchema.index({
  invitationId: 1,
  status: 1,
  createdAt: -1,
});

// סטטיסטיקות לפי סטטוס provider
WhatsappQueueSchema.index({
  invitationId: 1,
  providerStatus: 1,
  createdAt: -1,
});

// סטטיסטיקות לפי תזמון
WhatsappQueueSchema.index({
  scheduleId: 1,
  status: 1,
  createdAt: -1,
});

// שליפות לפי RSVP round
WhatsappQueueSchema.index({
  invitationId: 1,
  type: 1,
  round: 1,
  status: 1,
  createdAt: -1,
});

// תאימות לקוד ישן אם משתמש ב-roundNumber
WhatsappQueueSchema.index({
  invitationId: 1,
  type: 1,
  roundNumber: 1,
  status: 1,
  createdAt: -1,
});

// מניעת כפילות לפי אורח/תזמון/סבב/תבנית
WhatsappQueueSchema.index({
  invitationId: 1,
  guestId: 1,
  scheduleId: 1,
  type: 1,
  round: 1,
  templateName: 1,
});

/* ================= CLEANUP HELPERS ================= */

WhatsappQueueSchema.statics.releaseStuckJobs = async function (
  timeoutMinutes = 10
) {
  const timeoutDate = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  return this.updateMany(
    {
      status: "sending",
      lockedAt: { $lt: timeoutDate },
    },
    {
      $set: {
        status: "pending",
        lockedAt: null,
        lockedBy: null,
      },
    }
  );
};

/**
 * ביטול כל ההודעות שעדיין לא נשלחו לפי scheduleId.
 * לא נוגע בהודעות שכבר נשלחו.
 */
WhatsappQueueSchema.statics.cancelByScheduleId = async function (
  scheduleId: string
) {
  return this.updateMany(
    {
      scheduleId,
      status: { $in: ["pending", "scheduled"] },
    },
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    }
  );
};

/* ================= EXPORT ================= */

export default models.WhatsappQueue ||
  model("WhatsappQueue", WhatsappQueueSchema);