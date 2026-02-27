import mongoose, { Schema, models, model } from "mongoose";

/**
 * WhatsappQueue
 * תור מרכזי לשליחת הודעות WhatsApp
 * Worker בלבד שולח בפועל
 */

const WhatsappQueueSchema = new Schema(
  {
    /* ================= RELATIONS ================= */

    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      index: true,
    },

    guestId: {
      type: Schema.Types.ObjectId,
      ref: "InvitationGuest",
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
     * מזהה לוגי למניעת כפילות (idempotent design)
     * לדוגמה: invitationId_guestId_template_round1
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

    /* ================= LOCKING ================= */

    lockedAt: {
      type: Date,
      default: null,
      index: true,
    },

    /* ================= SCHEDULING ================= */

    scheduledFor: {
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

    status: {
      type: String,
      enum: ["pending", "sending", "sent", "failed"],
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

    lastError: {
      type: String,
      default: null,
    },

    failReason: {
      code: { type: String, default: null },
      message: { type: String, default: null },
      raw: { type: Schema.Types.Mixed, default: null },
    },

    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* ================= INDEXES ================= */

// Polling יעיל ל-worker
WhatsappQueueSchema.index({
  status: 1,
  scheduledFor: 1,
  createdAt: 1,
});

// שחרור jobs תקועים
WhatsappQueueSchema.index({
  status: 1,
  lockedAt: 1,
});

// fallback כפילות לפי invitation+guest+template
WhatsappQueueSchema.index(
  { invitationId: 1, guestId: 1, templateName: 1 },
  { unique: true, partialFilterExpression: { guestId: { $type: "objectId" } } }
);

/* ================= CLEANUP HELPERS ================= */

/**
 * סטטי לשחרור הודעות שנתקעו על sending מעל X דקות
 */
WhatsappQueueSchema.statics.releaseStuckJobs = async function (
  timeoutMinutes = 10
) {
  const timeoutDate = new Date(
    Date.now() - timeoutMinutes * 60 * 1000
  );

  return this.updateMany(
    {
      status: "sending",
      lockedAt: { $lt: timeoutDate },
    },
    {
      $set: {
        status: "pending",
        lockedAt: null,
      },
    }
  );
};

export default models.WhatsappQueue ||
  model("WhatsappQueue", WhatsappQueueSchema);