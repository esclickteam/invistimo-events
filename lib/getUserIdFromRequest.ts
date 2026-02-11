import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/* =========================
   Types
========================= */

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

function getCookieFromReq(req: Request | undefined, name: string) {
  try {
    // Request headers (App Router)
    const cookieHeader = req?.headers?.get("cookie");
    if (!cookieHeader) return null;

    const match = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`));

    return match ? match.split("=")[1] : null;
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

    if (!authToken && !impersonationToken) return null;

    /* ---------------------------------
       2) Decode base token
    ---------------------------------- */
    const baseDecoded = jwt.verify(
      authToken || impersonationToken!,
      process.env.JWT_SECRET!
    ) as any;

    const baseUserId =
      baseDecoded.userId || baseDecoded.id || baseDecoded._id || null;

    if (!baseUserId) return null;

    /* ---------------------------------
       3) Header impersonation (ADMIN → PRODUCER)
    ---------------------------------- */
    const impersonateUserId =
      req?.headers?.get("x-impersonate-user") ?? null;

    if (
      baseDecoded.role === "admin" &&
      impersonateUserId &&
      impersonateUserId !== String(baseUserId)
    ) {
      return {
        userId: impersonateUserId,
        role: "producer",
        impersonated: true,
        impersonatedBy: String(baseUserId),
        impersonationRole: "admin",
      };
    }

    /* ---------------------------------
       4) Cookie-based impersonation
    ---------------------------------- */
    if (impersonationToken) {
      const impersonatedDecoded = jwt.verify(
        impersonationToken,
        process.env.JWT_SECRET!
      ) as any;

      const impersonatedUserId =
        impersonatedDecoded.userId ||
        impersonatedDecoded.id ||
        impersonatedDecoded._id ||
        null;

      if (!impersonatedUserId) return null;

      return {
        userId: String(impersonatedUserId),
        role: impersonatedDecoded.role ?? "producer",
        impersonated: true,
        impersonatedBy: impersonatedDecoded.impersonatedBy,
        impersonationRole: impersonatedDecoded.impersonationRole,
      };
    }

    /* ---------------------------------
       5) Normal auth
    ---------------------------------- */
    return {
      userId: String(baseUserId),
      role: baseDecoded.role ?? "user",
      impersonated: false,
    };
  } catch (error) {
    console.error("❌ getUserIdFromRequest error:", error);
    return null;
  }
}
