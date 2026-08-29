import mongoose, { Schema, models } from "mongoose";

/* ===========================================================
   Helpers
=========================================================== */
function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;

  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  return fallback;
}

/* ===========================================================
   📞 Call Round Note Schema
   הערות נשמרות כלוג:
   - לא מוחקים
   - לא עורכים
   - אפשר להוסיף כמה הערות שרוצים
=========================================================== */
const CallRoundNoteSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    createdBy: {
      type: String,
      default: "מערכת",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

/* ===========================================================
   📞 Call Round Schema
   חשוב:
   callRounds = היסטוריית שיחות בלבד.
   זה לא נועל RSVP.
   זה לא מונע עריכת אורח.
   עובד בהוראת עבודה כן יכול להוסיף/לעדכן סבב.
=========================================================== */
const CallRoundSchema = new Schema(
  {
    roundNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 3,
    },

    /**
     * answered = ענה
     * no_answer = לא ענה
     */
    answerStatus: {
      type: String,
      enum: ["answered", "no_answer", null],
      default: null,
    },

    /**
     * תוצאה של סבב השיחה.
     *
     * חשוב:
     * כאן חייבים להכניס את כל הערכים שהמערכת יכולה לשמור בפועל,
     * כדי שעדכון רגיל של RSVP לא ייכשל בגלל callRounds ישן.
     */
    resultStatus: {
      type: String,
      enum: [
        "yes",
        "no",
        "pending",
        "answered",
        "no_answer",
        "will_reply",
        "callback",
        "needs_correction",
        "wrong_number",
        "undecided",
        null,
      ],
      default: null,
    },

    /**
     * כמה מגיעים לפי השיחה.
     * זה תיעוד של השיחה ולא נעילה של ה-RSVP.
     */
    amount: {
      type: Number,
      default: 1,
      min: 0,
      set: (v: unknown) => toNumber(v, 0),
    },

    /**
     * יומן הערות לסבב
     */
    notes: {
      type: [CallRoundNoteSchema],
      default: [],
    },

    calledAt: {
      type: Date,
      default: null,
    },

    updatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

/* ===========================================================
   📌 InvitationGuest Schema
=========================================================== */
const InvitationGuestSchema = new Schema(
  {
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      default: null,
      trim: true,
    },

    relation: {
      type: String,
      default: "",
      trim: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    /* ===============================
       ⭐ שיוך לקבוצה
    =============================== */
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      default: null,
      index: true,
    },

    /* ===============================
       ✅ סטטוס RSVP נוכחי
       תמיד ניתן לעריכה.
       לא תלוי בשיחות.
       לא תלוי במה שסומן קודם.
    =============================== */
    rsvp: {
      type: String,
      enum: ["yes", "no", "pending"],
      default: "pending",
      index: true,
    },

    /**
     * שמור בשביל קוד קיים שמשתמש ב-status
     */
    status: {
      type: String,
      enum: ["yes", "no", "pending"],
      default: "pending",
      index: true,
    },

    /**
     * כמה הוזמנו
     */
    guestsCount: {
      type: Number,
      default: 1,
      min: 0,
      set: (v: unknown) => toNumber(v, 0),
    },

    /**
     * כמה אישרו הגעה כרגע
     */
    arrivedCount: {
      type: Number,
      default: 0,
      min: 0,
      set: (v: unknown) => toNumber(v, 0),
    },

    /**
     * שמור בשביל קוד קיים שמשתמש ב-amount
     */
    amount: {
      type: Number,
      default: 0,
      min: 0,
      set: (v: unknown) => toNumber(v, 0),
    },

    /**
     * כמה הגיעו בפועל ביום האירוע
     */
    actualArrivedCount: {
      type: Number,
      default: 0,
      min: 0,
      set: (v: unknown) => toNumber(v, 0),
    },

    /* ===============================
       📞 סבבי שיחה
       היסטוריה בלבד.
       לא מונע עריכה רגילה.
    =============================== */
    callRounds: {
      type: [CallRoundSchema],
      default: [],
    },

    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /* ===============================
       🔗 מעקב פתיחת קישור אישי
       לא נוגע ב-RSVP / הערות / הושבה.
       אורחים קיימים נשארים "לא נפתח" עד פתיחה אמיתית.
    =============================== */
    firstOpenedAt: {
      type: Date,
      default: null,
    },

    lastOpenedAt: {
      type: Date,
      default: null,
    },

    openCount: {
      type: Number,
      default: 0,
      min: 0,
      set: (v: unknown) => toNumber(v, 0),
    },

    tableNumber: {
      type: Number,
      default: null,
    },

    tableName: {
      type: String,
      default: "",
      trim: true,
    },

    tableId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* ===========================================================
   Sync hooks
   חשוב:
   - לא נוגעים ב-callRounds כאן.
   - callRounds לא קובע אם מותר לערוך RSVP.
   - אם מסמנים לא מגיע, מאפסים רק את כמות המאשרים.
=========================================================== */
InvitationGuestSchema.pre("save", function () {
  const doc = this as any;

  if (doc.rsvp && doc.status !== doc.rsvp) {
    doc.status = doc.rsvp;
  }

  if (doc.status && doc.rsvp !== doc.status) {
    doc.rsvp = doc.status;
  }

  const arrived = toNumber(doc.arrivedCount, 0);
  const amount = toNumber(doc.amount, 0);

  if (arrived !== amount) {
    if (doc.isModified("amount")) {
      doc.arrivedCount = amount;
    } else if (doc.isModified("arrivedCount")) {
      doc.amount = arrived;
    }
  }

  if (doc.rsvp === "no") {
    doc.arrivedCount = 0;
    doc.amount = 0;
  }
});

/* ===========================================================
   Update validators hook
   כדי שגם findByIdAndUpdate / findOneAndUpdate יסנכרנו rsvp/status
   ולא רק save()
=========================================================== */
InvitationGuestSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() as any;

  if (!update) return;

  const $set = update.$set || {};

  const nextRsvp = $set.rsvp ?? update.rsvp;
  const nextStatus = $set.status ?? update.status;

  if (nextRsvp && !nextStatus) {
    $set.status = nextRsvp;
  }

  if (nextStatus && !nextRsvp) {
    $set.rsvp = nextStatus;
  }

  const finalRsvp = $set.rsvp ?? update.rsvp;

  if (finalRsvp === "no") {
    $set.arrivedCount = 0;
    $set.amount = 0;
  }

  if ($set.arrivedCount !== undefined && $set.amount === undefined) {
    $set.amount = toNumber($set.arrivedCount, 0);
  }

  if ($set.amount !== undefined && $set.arrivedCount === undefined) {
    $set.arrivedCount = toNumber($set.amount, 0);
  }

  update.$set = $set;

  delete update.rsvp;
  delete update.status;
  delete update.arrivedCount;
  delete update.amount;

  this.setUpdate(update);
});

/* ===========================================================
   Model
=========================================================== */
const InvitationGuest =
  models.InvitationGuest ||
  mongoose.model("InvitationGuest", InvitationGuestSchema);

export default InvitationGuest;