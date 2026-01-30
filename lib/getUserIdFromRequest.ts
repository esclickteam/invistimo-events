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
    const cookieStore = await cookies(); // ⭐ await חובה
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
    const authToken =
      getCookieFromReq(req, "authToken") ??
      (await getCookieFromHeadersStore("authToken"));

    if (!authToken) return null;

    const authDecoded = jwt.verify(
      authToken,
      process.env.JWT_SECRET!
    ) as any;

    const baseUserId =
      authDecoded.userId || authDecoded.id || authDecoded._id;

    if (!baseUserId) return null;

    // 🎭 impersonation
    const impersonationToken =
      getCookieFromReq(req, "impersonationToken") ??
      (await getCookieFromHeadersStore("impersonationToken"));

    if (!impersonationToken) {
      // 👤 רגיל – בלי התחזות
      return {
        userId: String(baseUserId),
        role: authDecoded.role ?? "user",
        impersonated: false,
      };
    }

    // 🧑‍💼 מי שמתחזה (producer / admin)
    const impersonationDecoded = jwt.verify(
      impersonationToken,
      process.env.JWT_SECRET!
    ) as any;

    const impersonatorId =
      impersonationDecoded.userId ||
      impersonationDecoded.id ||
      impersonationDecoded._id;

    return {
      userId: String(baseUserId),          // הלקוח
      role: "client",                      // תמיד client בהתחזות
      impersonated: true,
      impersonatedBy: String(impersonatorId),
      impersonationRole: impersonationDecoded.role,
    };
  } catch (error) {
    console.error("❌ getUserIdFromRequest error:", error);
    return null;
  }
}
