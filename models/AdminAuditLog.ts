import mongoose, { Schema, models, model } from "mongoose";

/**
 * יומן פעולות אדמין במצב ניהול משתמש (לא התחזות).
 * לא שומר מידע רגיש מיותר — רק סיכום לפני/אחרי רלוונטי.
 */
const AdminAuditLogSchema = new Schema(
  {
    adminUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adminName: { type: String, default: "", trim: true },
    adminEmail: { type: String, default: "", trim: true, lowercase: true },

    managedUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    managedUserName: { type: String, default: "", trim: true },
    managedUserEmail: { type: String, default: "", trim: true, lowercase: true },

    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      default: null,
      index: true,
    },
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      default: null,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    meta: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

AdminAuditLogSchema.index({ createdAt: -1 });
AdminAuditLogSchema.index({ managedUserId: 1, createdAt: -1 });

export default models.AdminAuditLog ||
  model("AdminAuditLog", AdminAuditLogSchema);
