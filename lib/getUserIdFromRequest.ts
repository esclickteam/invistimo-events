import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

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
  impersonated: boolean;
  impersonatedBy?: string;
  impersonationRole?: "producer" | "admin";
};

/* =========================
   Auth helper
========================= */

export async function getUserIdFromRequest(): Promise<AuthPayload | null> {
  try {
    const cookieStore = await cookies();

    // 🔑 PRIORITY: impersonation > auth
    const impersonationToken =
      cookieStore.get("impersonationToken")?.value ?? null;

    const authToken =
      cookieStore.get("authToken")?.value ?? null;

    const tokenToUse = impersonationToken || authToken;

    if (!tokenToUse) {
      return null;
    }

    const decoded = jwt.verify(
      tokenToUse,
      process.env.JWT_SECRET!
    ) as {
      userId?: string;
      role?: AuthRole;

      impersonatedBy?: string;
      impersonationRole?: "producer" | "admin";

      // backward compatibility
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

      impersonated: Boolean(impersonationToken),
      impersonatedBy: decoded.impersonatedBy,
      impersonationRole: decoded.impersonationRole,
    };
  } catch (error) {
    console.error("❌ getUserIdFromRequest error:", error);
    return null;
  }
}
