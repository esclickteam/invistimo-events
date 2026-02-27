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

    /**
     * מזהה הודעה אצל ספק ה-WhatsApp (Meta/360dialog)
     * שומר את ה-wamid שחוזר מהקריאה ל-API
     */
    wamid: {
      type: String,
      default: null,
      index: true,
    },

    /**
     * שעת נעילה - כדי למנוע מצב ש-2 workers לוקחים אותו Job
     * וגם כדי לשחרר jobs שנתקעו על "sending"
     */
    lockedAt: {
      type: Date,
      default: null,
      index: true,
    },

    // כל מה שצריך לשליחה (eventTitle, rsvpLink, headerImage וכו')
    payload: {
      type: Object,
      required: true,
    },

    // סטטוס שליחה
    // pending  - ממתין
    // sending  - ננעל ע"י worker
    // sent     - נשלח ל-API (accepted) אבל לא בהכרח delivered
    // failed   - נכשל סופית
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
      default: null,
    },

    // מתי נשלח בפועל
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
  }
);

// אינדקסים חשובים לתור
WhatsappQueueSchema.index({ status: 1, createdAt: 1 });

// אינדקס לשחרור stuck jobs
WhatsappQueueSchema.index({ status: 1, lockedAt: 1 });

// (אופציונלי, אבל מומלץ מאוד) מניעת כפילות ברמת DB לאותו אורח+טמפלט באותה הזמנה
// אם תרצי בעתיד לשלוח שוב אותו template לאותו אורח, נוסיף campaignKey ונכלול אותו באינדקס.
WhatsappQueueSchema.index(
  { invitationId: 1, guestId: 1, templateName: 1 },
  { unique: true, partialFilterExpression: { guestId: { $type: "objectId" } } }
);

export default models.WhatsappQueue ||
  model("WhatsappQueue", WhatsappQueueSchema);