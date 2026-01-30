import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export type AuthRole = "admin" | "user" | "producer" | "client";

export type AuthPayload = {
  userId: string;
  role: AuthRole;
  impersonated: boolean;
  impersonatedBy?: string;
  impersonationRole?: "producer" | "admin";
};

/* =========================
   Cookie helpers
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
   Auth helper (FIXED)
========================= */
export async function getUserIdFromRequest(
  req?: NextRequest
): Promise<AuthPayload | null> {
  try {
    // ⭐️ אותו סדר כמו /api/me
    const producerToken =
      getCookieFromReq(req, "producerAuthToken") ??
      (await getCookieFromHeadersStore("producerAuthToken"));

    const authToken =
      getCookieFromReq(req, "authToken") ??
      (await getCookieFromHeadersStore("authToken"));

    const token = producerToken ?? authToken;
    if (!token) return null;

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as any;

    const userId =
      decoded.userId || decoded.id || decoded._id;
    if (!userId) return null;

    return {
      userId: String(userId),
      role: decoded.role ?? "user",
      impersonated: !!decoded.impersonated,
      impersonatedBy: decoded.impersonatedBy
        ? String(decoded.impersonatedBy)
        : undefined,
      impersonationRole: decoded.impersonationRole,
    };
  } catch (error) {
    console.error("❌ getUserIdFromRequest error:", error);
    return null;
  }
}
