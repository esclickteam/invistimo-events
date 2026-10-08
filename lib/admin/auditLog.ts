import AdminAuditLog from "@/models/AdminAuditLog";

type WriteAdminAuditParams = {
  adminUserId: string;
  adminName?: string;
  adminEmail?: string;
  managedUserId: string;
  managedUserName?: string;
  managedUserEmail?: string;
  eventId?: string | null;
  invitationId?: string | null;
  action: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  meta?: unknown;
};

export async function writeAdminAuditLog(params: WriteAdminAuditParams) {
  try {
    await AdminAuditLog.create({
      adminUserId: params.adminUserId,
      adminName: params.adminName || "",
      adminEmail: params.adminEmail || "",
      managedUserId: params.managedUserId,
      managedUserName: params.managedUserName || "",
      managedUserEmail: params.managedUserEmail || "",
      eventId: params.eventId || null,
      invitationId: params.invitationId || null,
      action: params.action,
      summary: params.summary,
      before: params.before ?? null,
      after: params.after ?? null,
      meta: params.meta ?? null,
    });
  } catch (err) {
    console.error("❌ writeAdminAuditLog failed:", err);
  }
}
