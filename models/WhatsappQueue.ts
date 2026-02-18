import mongoose, { Schema, models, model } from "mongoose";

/**
 * WhatsappQueue
 * תור מרכזי לשליחת הודעות WhatsApp
 * כל הודעה נשלחת ע"י Cron / Worker בלבד
 */

const WhatsappQueueSchema = new Schema(
  {
    // קשרים (לא חובה אבל מומלץ)
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

    // יעד
    phone: {
      type: String,
      required: true,
      index: true,
    },

    // שם התבנית (rsvp_invitation_media וכו')
    templateName: {
      type: String,
      required: true,
      index: true,
    },

    // כל מה שצריך לשליחה (eventTitle, rsvpLink, headerImage וכו')
    payload: {
      type: Object,
      required: true,
    },

    // סטטוס שליחה
    status: {
      type: String,
      enum: ["pending", "sending", "sent", "failed"],
      default: "pending",
      index: true,
    },

    // ניסיונות שליחה
    attempts: {
      type: Number,
      default: 0,
    },

    // שגיאה אחרונה (אם נכשלה)
    lastError: {
      type: String,
    },

    // מתי נשלח בפועל
    sentAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
  }
);

// אינדקס חשוב לתור
WhatsappQueueSchema.index({ status: 1, createdAt: 1 });

export default models.WhatsappQueue ||
  model("WhatsappQueue", WhatsappQueueSchema);
