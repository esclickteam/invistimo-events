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
     * מזהה ייחודי אמיתי למניעת כפילות
     * כל שליחה היא ישות נפרדת
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
      enum: ["pending", "scheduled", "sent", "failed"],
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

/* ================= CLEANUP HELPERS ================= */

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