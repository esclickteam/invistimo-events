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

const auditedRequests = new WeakSet<object>();

/**
 * When an admin is inside a customer account, record the real actor.
 * Regular customer requests are ignored.
 */
export async function recordAdminCustomerMutation(
  req: Request | undefined,
  auth: {
    userId?: string | null;
    impersonatedBy?: string | null;
    impersonatedByAdmin?: boolean;
  } | null
) {
  try {
    if (!req || !auth?.impersonatedByAdmin || !auth.impersonatedBy || !auth.userId) {
      return;
    }

    const method = String(req.method || "GET").toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
    if (auditedRequests.has(req)) return;

    const pathname = new URL(req.url).pathname;
    if (pathname.startsWith("/api/admin/")) return;

    auditedRequests.add(req);

    await writeAdminAuditLog({
      adminUserId: String(auth.impersonatedBy),
      managedUserId: String(auth.userId),
      action: "customer_account_mutation",
      summary: `אדמין ביצע ${method} ${pathname} בחשבון הלקוח`,
      meta: { method, pathname },
    });
  } catch (err) {
    console.error("❌ recordAdminCustomerMutation failed:", err);
  }
}

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
