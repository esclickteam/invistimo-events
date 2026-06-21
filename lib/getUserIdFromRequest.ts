import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

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
  | "staff_producer"
  | "client"
  | "user"
  | "staff"
  | "venue_owner";

export type EmployeeScope = "system" | "producer" | "venue" | "client";

export type AuthPayload = {
  userId: string;
  role: AuthRole;
  staffType?: string | null;
  employeeScope?: EmployeeScope | null;

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

    return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
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

function normalizeEmployeeScope(raw: any): EmployeeScope | null {
  if (
    raw === "system" ||
    raw === "producer" ||
    raw === "venue" ||
    raw === "client"
  ) {
    return raw;
  }

  return null;
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

function decodeJwtToken(token: string | null) {
  try {
    if (!token || !process.env.JWT_SECRET) return null;
    return jwt.verify(token, process.env.JWT_SECRET) as any;
  } catch {
    return null;
  }
}

function getDecodedUserId(decoded: any) {
  return decoded?.userId || decoded?.id || decoded?._id || null;
}

async function getFreshUserAuthFields(userId: string) {
  try {
    await connectDB();

    const user = await User.findById(userId)
      .select("role staffType employeeScope")
      .lean();

    if (!user) return null;

    return {
      role: normalizeRole((user as any).role),
      staffType: (user as any).staffType ?? null,
      employeeScope: normalizeEmployeeScope((user as any).employeeScope),
    };
  } catch (err) {
    console.error("❌ getFreshUserAuthFields error:", err);
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

    const staffOriginalUserId =
      getCookieFromReq(req, "staffOriginalUserId") ??
      (await getCookieFromHeadersStore("staffOriginalUserId"));

    if (!authToken && !impersonationToken && !producerAuthToken) {
      return null;
    }

    /* ---------------------------------
       2) Decode tokens
    ---------------------------------- */
    const impersonationDecoded = decodeJwtToken(impersonationToken);
    const authDecoded = decodeJwtToken(authToken);
    const producerDecoded = decodeJwtToken(producerAuthToken);

    /*
      חשוב:
      activeDecoded הוא המשתמש הפעיל בפועל.
      בזמן התחזות זה הלקוח.
    */
    const activeDecoded =
      impersonationDecoded || authDecoded || producerDecoded;

    if (!activeDecoded) return null;

    const userId = getDecodedUserId(activeDecoded);
    if (!userId) return null;

    const freshUserAuthFields = await getFreshUserAuthFields(String(userId));

    const role = freshUserAuthFields?.role ?? normalizeRole(activeDecoded.role);

    const staffType =
      freshUserAuthFields?.staffType ?? activeDecoded.staffType ?? null;

    const employeeScope =
      freshUserAuthFields?.employeeScope ??
      normalizeEmployeeScope(activeDecoded.employeeScope);

    /* ---------------------------------
       3) Find original impersonator
    ---------------------------------- */
    const authUserId = getDecodedUserId(authDecoded);
    const producerUserId = getDecodedUserId(producerDecoded);

    const impersonatedBy =
      activeDecoded.impersonatedBy ||
      impersonationDecoded?.impersonatedBy ||
      staffOriginalUserId ||
      authUserId ||
      producerUserId ||
      null;

    let impersonationRole =
      normalizeImpersonationRole(activeDecoded.impersonationRole) ||
      normalizeImpersonationRole(impersonationDecoded?.impersonationRole) ||
      normalizeImpersonationRole(authDecoded?.role) ||
      normalizeImpersonationRole(producerDecoded?.role);

    /*
      אם יש authToken מקורי של אדמין בזמן התחזות,
      חייבים לשמר impersonationRole=admin כדי ש־admin routes לא ייחסמו.
    */
    if (authUserId) {
      const freshOriginalAuth = await getFreshUserAuthFields(String(authUserId));

      if (freshOriginalAuth?.role === "admin") {
        impersonationRole = "admin";
      }
    }

    /* ---------------------------------
       4) Header-based impersonation
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
        employeeScope: null,
        impersonated: true,
        impersonatedBy: String(userId),
        impersonationRole: "admin",
      };
    }

    /* ---------------------------------
       5) Unified impersonation detection
    ---------------------------------- */
    const isImpersonated =
      Boolean(impersonationToken) ||
      Boolean(activeDecoded.impersonated) ||
      Boolean(activeDecoded.impersonatedBy) ||
      Boolean(staffOriginalUserId);

    if (isImpersonated) {
      return {
        userId: String(userId),
        role,
        staffType,
        employeeScope,
        impersonated: true,
        impersonatedBy: impersonatedBy ? String(impersonatedBy) : null,
        impersonationRole,
      };
    }

    /* ---------------------------------
       6) Normal auth
    ---------------------------------- */
    return {
      userId: String(userId),
      role,
      staffType,
      employeeScope,
      impersonated: false,
      impersonatedBy: null,
      impersonationRole: null,
    };
  } catch (error) {
    console.error("❌ getUserIdFromRequest error:", error);
    return null;
  }
}