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
    },
  },
  {
    _id: false,
  }
);

/* ===========================================================
   📞 Call Round Schema
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
      enum: ["answered", "no_answer"],
      default: null,
    },

    /**
     * yes = מגיע
     * no = לא מגיע
     * will_reply = ישיב בהודעה
     * needs_correction = ממתין לתיקון
     */
    resultStatus: {
      type: String,
      enum: ["yes", "no", "will_reply", "needs_correction"],
      default: null,
    },

    /**
     * כמה מגיעים
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
       ✅ סטטוס RSVP
       yes = מגיע
       no = לא מגיע
       pending = בהמתנה
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

    // ✅ כמה הוזמנו
    guestsCount: {
      type: Number,
      default: 1,
      min: 0,
      set: (v: unknown) => toNumber(v, 0),
    },

    // ✅ כמה אישרו הגעה
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

    // ✅ כמה הגיעו בפועל ביום האירוע
    actualArrivedCount: {
      type: Number,
      default: 0,
      min: 0,
      set: (v: unknown) => toNumber(v, 0),
    },

    /* ===============================
       📞 סבבי שיחה
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
   בלי next() כדי למנוע שגיאת TypeScript
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

export default models.InvitationGuest ||
  mongoose.model("InvitationGuest", InvitationGuestSchema);