import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/* =========================
   Types
========================= */

export type AuthRole = "admin" | "user" | "producer" | "client";

export type AuthPayload = {
  userId: string;
  role: AuthRole;

  // ✅ הוספה
  staffType?: "producer_staff" | "admin_staff";

  impersonated: boolean;
  impersonatedBy?: string;
  impersonationRole?: "producer" | "admin";
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

/* =========================
   Auth helper
========================= */

export async function getUserIdFromRequest(
  req?: Request
): Promise<AuthPayload | null> {
  try {
    /* ---------------------------------
       1) Read cookies
    ---------------------------------- */
    const impersonationToken =
      getCookieFromReq(req, "impersonationToken") ??
      (await getCookieFromHeadersStore("impersonationToken"));

    const authToken =
      getCookieFromReq(req, "authToken") ??
      (await getCookieFromHeadersStore("authToken"));

    // אין שום token
    if (!authToken && !impersonationToken) return null;

    /* ---------------------------------
       2) Choose active token (CRITICAL FIX)
       impersonationToken תמיד קודם
    ---------------------------------- */
    const activeToken = impersonationToken || authToken;
    if (!activeToken) return null;

    const decoded = jwt.verify(
      activeToken,
      process.env.JWT_SECRET!
    ) as any;

    const userId =
      decoded.userId || decoded.id || decoded._id || null;

    if (!userId) return null;

    /* ---------------------------------
       3) Header impersonation (ADMIN → PRODUCER)
    ---------------------------------- */
    const impersonateUserId =
      req?.headers?.get("x-impersonate-user") ?? null;

    if (
      decoded.role === "admin" &&
      impersonateUserId &&
      impersonateUserId !== String(userId)
    ) {
      return {
        userId: String(impersonateUserId),
        role: "producer",
        impersonated: true,
        impersonatedBy: String(userId),
        impersonationRole: "admin",
      };
    }

    /* ---------------------------------
       4) Cookie-based impersonation
    ---------------------------------- */
    if (impersonationToken) {
      return {
        userId: String(userId),
        role: decoded.role ?? "producer",
        impersonated: true,
        impersonatedBy: decoded.impersonatedBy,
        impersonationRole: decoded.impersonationRole,
      };
    }

    /* ---------------------------------
       5) Normal auth
    ---------------------------------- */
    return {
      userId: String(userId),
      role: decoded.role ?? "user",
      impersonated: false,
    };
  } catch (error) {
    console.error("❌ getUserIdFromRequest error:", error);
    return null;
  }
}
