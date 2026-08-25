import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================
   Constants
========================= */

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 ימים
const SESSION_EXPIRES_IN = "7d";

/* =========================
   Cookie helpers
========================= */

async function getCookieStore() {
  const store = cookies();
  return store instanceof Promise ? await store : store;
}

function getCookieDomain() {
  return process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;
}

function cookieOptions(httpOnly = true) {
  const domain = getCookieDomain();

  return {
    path: "/",
    httpOnly,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    ...(domain ? { domain } : {}),
    maxAge: SESSION_MAX_AGE,
  };
}

function expireCookie(res: NextResponse, name: string, httpOnly = true) {
  const domain = getCookieDomain();

  const base = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  res.cookies.set(name, "", {
    ...base,
    ...(domain ? { domain } : {}),
    httpOnly,
  });

  res.cookies.set(name, "", {
    ...base,
    httpOnly,
  });
}

/* =========================
   Types
========================= */

type JwtPayload = {
  userId?: string;
  id?: string;
  _id?: string;
  role?: string;
  staffType?: string | null;

  hasPaid?: boolean;
  isTrial?: boolean;

  impersonated?: boolean;
  impersonatedBy?: string;
  impersonatedByAdmin?: boolean;
  adminId?: string;
  impersonationRole?: string;
  originalTargetRole?: string;
  impersonationSourceRole?: string;

  iat?: number;
  exp?: number;
};

/* =========================
   Helpers
========================= */

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRole(value: unknown) {
  return cleanStr(value).toLowerCase();
}

function normalizeStaffType(value: unknown) {
  return cleanStr(value).toLowerCase();
}

function resolveTargetEffectiveRole(user: any) {
  const role = normalizeRole(user?.role);
  const staffType = normalizeStaffType(user?.staffType);

  if (role === "admin") return "admin";
  if (role === "producer") return "producer";
  if (role === "venue_owner") return "venue_owner";

  if (role === "staff" && staffType === "producer_staff") {
    return "producer_staff";
  }

  if (role === "staff") {
    return "staff";
  }

  return role || "user";
}

function resolveRedirectUrl(targetEffectiveRole: string) {
  switch (targetEffectiveRole) {
    case "admin":
      return "/admin";

    case "producer":
      return "/producer/dashboard";

    case "producer_staff":
      return "/producer-staff/dashboard";

    case "staff":
      return "/staff/dashboard";

    case "venue_owner":
      return "/venues/dashboard";

    default:
      return "/dashboard";
  }
}

/* =========================
   POST /api/admin/impersonate
========================= */

export async function POST(req: Request) {
  try {
    await connectDB();

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET_MISSING");

      return NextResponse.json(
        {
          success: false,
          error: "JWT_SECRET_MISSING",
        },
        {
          status: 500,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const cookieStore = await getCookieStore();

    const adminToken =
      cookieStore.get("adminAuthToken")?.value ||
      cookieStore.get("adminToken")?.value ||
      cookieStore.get("authToken")?.value ||
      cookieStore.get("token")?.value ||
      null;

    if (!adminToken) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    /* =========================
       Verify admin token
    ========================= */

    let decoded: JwtPayload;

    try {
      decoded = jwt.verify(adminToken, process.env.JWT_SECRET) as JwtPayload;
    } catch (err) {
      console.error("❌ Invalid admin token:", err);

      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ADMIN_TOKEN",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const adminUserId = String(
      decoded?.impersonatedBy ||
        decoded?.adminId ||
        decoded?.userId ||
        decoded?.id ||
        decoded?._id ||
        ""
    );

    const actingRole = normalizeRole(decoded?.role);

    const isAdmin =
      actingRole === "admin" ||
      decoded?.impersonationSourceRole === "admin" ||
      decoded?.impersonatedByAdmin === true ||
      Boolean(decoded?.impersonatedBy) ||
      Boolean(decoded?.adminId);

    if (!isAdmin || !adminUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
        },
        {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    /* =========================
       Verify admin in DB
    ========================= */

    const adminUser = await User.findById(adminUserId)
      .select("_id role")
      .lean();

    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
        },
        {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    /* =========================
       Body
    ========================= */

    const body = await req.json().catch(() => ({} as any));
    const userId = cleanStr(body?.userId);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_USER_ID",
        },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    /* =========================
       Target user
    ========================= */

    const user: any = await User.findById(userId)
      .select(
        "_id role staffType producerId assignedProducerId createdByProducer email name hasPaid isTrial trialExpiresAt authVersion isActive"
      )
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
        },
        {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const targetEffectiveRole = resolveTargetEffectiveRole(user);
    const redirectUrl = resolveRedirectUrl(targetEffectiveRole);

    const role = normalizeRole(user.role) || "user";
    const staffType = user.staffType ? String(user.staffType) : null;

    const hasPaid = user.hasPaid ?? true;
    const isTrial = Boolean(user.isTrial);

    /* =========================
       Impersonation Token
    ========================= */

    const targetAuthVersion = Number((user as any)?.authVersion ?? 0);

    const impersonationToken = jwt.sign(
      {
        userId: String(user._id),

        // התפקיד האמיתי של המשתמש שאליו מתחזים
        role,
        staffType,

        producerId: user.producerId ? String(user.producerId) : null,
        assignedProducerId: user.assignedProducerId
          ? String(user.assignedProducerId)
          : null,
        createdByProducer: user.createdByProducer ?? null,

        hasPaid,
        isTrial,
        trialExpiresAt: user.trialExpiresAt
          ? new Date(user.trialExpiresAt).getTime()
          : null,

        // Must match User.authVersion for getUserIdFromRequest
        authVersion: Number.isFinite(targetAuthVersion) ? targetAuthVersion : 0,

        // מצב התחזות
        impersonated: true,
        impersonatedBy: adminUserId,
        impersonatedByAdmin: true,
        adminId: adminUserId,

        /*
          חשוב:
          לא לשים כאן "admin".
          כאן צריך להיות התפקיד שאליו מתחזים,
          אחרת /api/me וה־guards עלולים לחשוב שהמשתמש הוא אדמין.
        */
        impersonationRole: targetEffectiveRole,
        originalTargetRole: targetEffectiveRole,

        // מזהה שמקור ההתחזות הוא אדמין
        impersonationSourceRole: "admin",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: SESSION_EXPIRES_IN,
      }
    );

    const res = NextResponse.json(
      {
        success: true,

        role,
        staffType,

        impersonated: true,
        impersonatedByAdmin: true,
        impersonationRole: targetEffectiveRole,
        originalTargetRole: targetEffectiveRole,
        impersonationSourceRole: "admin",

        redirectUrl,
        impersonatedBy: adminUserId,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );

    /* =========================
       Clear previous active state
    ========================= */

    const cookiesToClear = [
      "authToken",
      "token",
      "impersonationToken",

      // client-readable UX cookies
      "hasPaid",
      "isTrial",
      "trialExpiresAt",
      "role",
      "staffType",
      "impersonationRole",
      "originalTargetRole",
      "impersonationSourceRole",
      "impersonatedByAdmin",
    ];

    for (const name of cookiesToClear) {
      const isHttpOnly =
        name === "authToken" ||
        name === "token" ||
        name === "impersonationToken";

      expireCookie(res, name, isHttpOnly);
    }

    /* =========================
       Save original admin token
    ========================= */

    res.cookies.set("adminAuthToken", adminToken, cookieOptions(true));
    res.cookies.set("adminToken", adminToken, cookieOptions(true));

    /* =========================
       Set impersonation as active session
    ========================= */

    res.cookies.set("authToken", impersonationToken, cookieOptions(true));
    res.cookies.set("token", impersonationToken, cookieOptions(true));
    res.cookies.set(
      "impersonationToken",
      impersonationToken,
      cookieOptions(true)
    );

    /* =========================
       Client-readable UX cookies
       לא אבטחה — רק תצוגה/ניווט
    ========================= */

    res.cookies.set("role", role, cookieOptions(false));

    if (staffType) {
      res.cookies.set("staffType", staffType, cookieOptions(false));
    } else {
      expireCookie(res, "staffType", false);
    }

    res.cookies.set(
      "impersonationRole",
      targetEffectiveRole,
      cookieOptions(false)
    );

    res.cookies.set(
      "originalTargetRole",
      targetEffectiveRole,
      cookieOptions(false)
    );

    res.cookies.set(
      "impersonationSourceRole",
      "admin",
      cookieOptions(false)
    );

    res.cookies.set(
      "impersonatedByAdmin",
      "true",
      cookieOptions(false)
    );

    res.cookies.set("hasPaid", String(hasPaid), cookieOptions(false));
    res.cookies.set("isTrial", String(isTrial), cookieOptions(false));

    if (isTrial && user.trialExpiresAt) {
      res.cookies.set(
        "trialExpiresAt",
        String(new Date(user.trialExpiresAt).getTime()),
        cookieOptions(false)
      );
    } else {
      expireCookie(res, "trialExpiresAt", false);
    }

    return res;
  } catch (err) {
    console.error("❌ Admin impersonation error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}