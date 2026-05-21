import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/* =========================
   Types
========================= */

export type AuthRole =
  | "admin"
  | "user"
  | "producer"
  | "client"
  | "staff"
  | "venue_owner";

export type ImpersonationRole =
  | "producer"
  | "admin"
  | "producer_staff"
  | "staff_producer" // backward compatibility
  | "client"
  | "user"
  | "staff"
  | "venue_owner";

export type AuthPayload = {
  userId: string;
  role: AuthRole;
  staffType?: string | null;

  impersonated: boolean;
  impersonatedBy?: string | null;
  impersonationRole?: ImpersonationRole | null;
};

/* =========================
   Helpers
========================= */

function getCookieFromReq(req: Request | undefined, name: string) {
  try {
    const cookieHeader = req?.headers?.get("cookie");
    if (!cookieHeader) return null;

    const match = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`));

    return match ? match.split("=").slice(1).join("=") : null;
  } catch {
    return null;
  }
}

async function getCookieFromHeadersStore(name: string) {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(name)?.value ?? null;
  } catch {
    return null;
  }
}

function normalizeRole(raw: any): AuthRole {
  if (
    raw === "admin" ||
    raw === "user" ||
    raw === "producer" ||
    raw === "client" ||
    raw === "staff" ||
    raw === "venue_owner"
  ) {
    return raw;
  }

  return "user";
}

function normalizeImpersonationRole(raw: any): ImpersonationRole | null {
  if (
    raw === "producer" ||
    raw === "admin" ||
    raw === "producer_staff" ||
    raw === "staff_producer" ||
    raw === "client" ||
    raw === "user" ||
    raw === "staff" ||
    raw === "venue_owner"
  ) {
    return raw;
  }

  return null;
}

/* =========================
   Auth helper
========================= */

export async function getUserIdFromRequest(
  req?: Request
): Promise<AuthPayload | null> {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET missing in getUserIdFromRequest");
      return null;
    }

    /* ---------------------------------
       1) Read cookies
    ---------------------------------- */
    const impersonationToken =
      getCookieFromReq(req, "impersonationToken") ??
      (await getCookieFromHeadersStore("impersonationToken"));

    const authToken =
      getCookieFromReq(req, "authToken") ??
      (await getCookieFromHeadersStore("authToken"));

    const producerAuthToken =
      getCookieFromReq(req, "producerAuthToken") ??
      (await getCookieFromHeadersStore("producerAuthToken"));

    // אין שום token
    if (!authToken && !impersonationToken && !producerAuthToken) {
      return null;
    }

    /* ---------------------------------
       2) Choose active token
       עדיפות:
       impersonationToken -> authToken -> producerAuthToken
    ---------------------------------- */
    const activeToken = impersonationToken || authToken || producerAuthToken;
    if (!activeToken) return null;

    const decoded = jwt.verify(activeToken, process.env.JWT_SECRET) as any;

    const userId = decoded.userId || decoded.id || decoded._id || null;
    if (!userId) return null;

    const role = normalizeRole(decoded.role);
    const staffType = decoded.staffType ?? null;

    /* ---------------------------------
       3) Header-based impersonation
       אם את עדיין משתמשת בזה
    ---------------------------------- */
    const impersonateUserId = req?.headers?.get("x-impersonate-user") ?? null;

    if (
      role === "admin" &&
      impersonateUserId &&
      impersonateUserId !== String(userId)
    ) {
      return {
        userId: String(impersonateUserId),
        role: "user",
        staffType: null,
        impersonated: true,
        impersonatedBy: String(userId),
        impersonationRole: "admin",
      };
    }

    /* ---------------------------------
       4) Unified impersonation detection
       עובד גם אם אין impersonationToken נפרד,
       אלא flags בתוך authToken
    ---------------------------------- */
    const isImpersonated =
      !!impersonationToken || !!decoded.impersonated || !!decoded.impersonatedBy;

    if (isImpersonated) {
      return {
        userId: String(userId),
        role,
        staffType,
        impersonated: true,
        impersonatedBy: decoded.impersonatedBy
          ? String(decoded.impersonatedBy)
          : null,
        impersonationRole: normalizeImpersonationRole(
          decoded.impersonationRole
        ),
      };
    }

    /* ---------------------------------
       5) Normal auth
    ---------------------------------- */
    return {
      userId: String(userId),
      role,
      staffType,
      impersonated: false,
      impersonatedBy: null,
      impersonationRole: null,
    };
  } catch (error) {
    console.error("❌ getUserIdFromRequest error:", error);
    return null;
  }
}