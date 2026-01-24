import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

/* =========================
   Types
========================= */

export type AuthRole = "admin" | "user" | "producer" | "client";

export type AuthPayload = {
  userId: string;
  role: AuthRole;

  // impersonation (optional)
  impersonated: boolean;
  impersonatedBy?: string;
  impersonationRole?: "producer" | "admin";
};

/* =========================
   Helpers
========================= */

function getCookieFromReq(req: NextRequest | undefined, name: string) {
  try {
    return req?.cookies?.get(name)?.value ?? null;
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
  req?: NextRequest
): Promise<AuthPayload | null> {
  try {
    // same logic: impersonationToken > authToken
    const impersonationToken =
      getCookieFromReq(req, "impersonationToken") ??
      (await getCookieFromHeadersStore("impersonationToken"));

    const authToken =
      getCookieFromReq(req, "authToken") ??
      (await getCookieFromHeadersStore("authToken"));

    const tokenToUse = impersonationToken || authToken;

    if (!tokenToUse) return null;

    const decoded = jwt.verify(tokenToUse, process.env.JWT_SECRET!) as {
      userId?: string;
      role?: AuthRole;

      impersonatedBy?: string;
      impersonationRole?: "producer" | "admin";

      // backward compatibility
      id?: string;
      _id?: string;
    };

    const userId = decoded.userId || decoded.id || decoded._id || null;
    if (!userId) return null;

    return {
      userId: String(userId),
      role: decoded.role ?? "user",

      impersonated: Boolean(impersonationToken),
      impersonatedBy: decoded.impersonatedBy,
      impersonationRole: decoded.impersonationRole,
    };
  } catch (error) {
    console.error("❌ getUserIdFromRequest error:", error);
    return null;
  }
}
