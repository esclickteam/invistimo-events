import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { ReadonlyRequestCookies } from
  "next/dist/server/web/spec-extension/adapters/request-cookies";

/* =========================
   Types
========================= */

export type AuthRole =
  | "admin"
  | "user"
  | "producer"
  | "client";

export type AuthPayload = {
  userId: string;
  role: AuthRole;

  // impersonation (optional)
  impersonated?: boolean;
  impersonatedBy?: string;
  impersonationRole?: "producer" | "admin";
};

/* =========================
   Internal helper
========================= */

async function getCookieStore(): Promise<ReadonlyRequestCookies> {
  const store = cookies();
  return store instanceof Promise ? await store : store;
}

/* =========================
   Auth helper
========================= */

export async function getUserIdFromRequest(): Promise<AuthPayload | null> {
  try {
    const cookieStore = await getCookieStore();

    const token =
      cookieStore.get("authToken")?.value ||
      cookieStore.get("token")?.value ||
      null;

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as Partial<AuthPayload> & {
      id?: string;
      _id?: string;
    };

    const userId =
      decoded.userId ||
      decoded.id ||
      decoded._id ||
      null;

    if (!userId) {
      return null;
    }

    return {
      userId: String(userId),
      role: decoded.role ?? "user",

      impersonated: decoded.impersonated,
      impersonatedBy: decoded.impersonatedBy,
      impersonationRole: decoded.impersonationRole,
    };
  } catch (error) {
    console.error("❌ getUserIdFromRequest error:", error);
    return null;
  }
}
