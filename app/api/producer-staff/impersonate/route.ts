export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/* =========================================================
   Constants
========================================================= */

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 ימים
const SESSION_EXPIRES_IN = "7d";

/* =========================================================
   Cookie helpers
========================================================= */

async function getCookieStore() {
  const store = cookies();
  return store instanceof Promise ? await store : store;
}

function getCookieDomain() {
  return process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;
}

function httpOnlyCookieOptions() {
  const domain = getCookieDomain();

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(domain ? { domain } : {}),
    maxAge: SESSION_MAX_AGE,
  };
}

function clientCookieOptions() {
  const domain = getCookieDomain();

  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(domain ? { domain } : {}),
    maxAge: SESSION_MAX_AGE,
  };
}

function deleteCookieOptions(httpOnly = true, withDomain = true) {
  const domain = getCookieDomain();

  return {
    httpOnly,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(withDomain && domain ? { domain } : {}),
    maxAge: 0,
    expires: new Date(0),
  };
}

function expireCookie(res: Response, name: string, httpOnly = true) {
  // Response.json מחזיר Response רגיל, אבל ב-Next אפשר לעבוד נוח יותר עם NextResponse.
  // לכן בפועל נשתמש ב-NextResponse בהמשך.
}

/* =========================================================
   Types
========================================================= */

type DecodedToken = {
  userId?: string;
  id?: string;
  _id?: string;
  role?: string;
  staffType?: string;
  impersonated?: boolean;
  impersonatedBy?: string;
  impersonationRole?: string;
  hasPaid?: boolean;
  iat?: number;
  exp?: number;
};

/* =========================================================
   POST /api/producer-staff/impersonate
========================================================= */

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET missing");

      return NextResponse.json(
        {
          success: false,
          message: "Server configuration error",
        },
        {
          status: 500,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const cookieStore = await getCookieStore();

    const token =
      cookieStore.get("authToken")?.value ||
      cookieStore.get("token")?.value ||
      null;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "No token",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    let decoded: DecodedToken;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    } catch (err) {
      console.error("❌ producer-staff invalid token:", err);

      return NextResponse.json(
        {
          success: false,
          message: "Invalid token",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    // חייב להיות עובד
    if (decoded.role !== "staff") {
      return NextResponse.json(
        {
          success: false,
          message: "Not staff",
        },
        {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const staffId = decoded.userId || decoded.id || decoded._id;

    if (!staffId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing staff id",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const staff: any = await User.findById(staffId)
      .select(
        "_id role staffType assignedClientIds name email hasPaid isTrial trialExpiresAt"
      )
      .lean();

    if (!staff) {
      return NextResponse.json(
        {
          success: false,
          message: "Staff not found",
        },
        {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    // חייב להיות עובד מפיק לפי DB
    if (staff.staffType !== "producer_staff") {
      return NextResponse.json(
        {
          success: false,
          message: "Not producer staff",
        },
        {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = body?.targetUserId;

    if (!targetUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing targetUserId",
        },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    // בדיקה שהמשתמש הוקצה לעובד
    const assignedIds = (staff.assignedClientIds || []).map(String);

    if (!assignedIds.includes(String(targetUserId))) {
      return NextResponse.json(
        {
          success: false,
          message: "User not assigned",
        },
        {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const targetUser: any = await User.findById(targetUserId)
      .select("_id role name email event hasPaid isTrial trialExpiresAt")
      .lean();

    if (!targetUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Target not found",
        },
        {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    // לא מאפשרים התחזות לאדמין / מפיק
    if (targetUser.role === "admin" || targetUser.role === "producer") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden role",
        },
        {
          status: 403,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const hasPaid = targetUser.hasPaid ?? true;
    const isTrial = Boolean(targetUser.isTrial);

    // יצירת טוקן התחזות
    const impersonationToken = jwt.sign(
      {
        userId: String(targetUser._id),
        role: targetUser.role || "client",

        hasPaid,
        isTrial,

        impersonated: true,
        impersonatedBy: String(staff._id),
        impersonationRole: "producer_staff",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: SESSION_EXPIRES_IN,
      }
    );

    const res = NextResponse.json(
      {
        success: true,
        role: targetUser.role,
        eventId: targetUser.event ?? null,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );

    /* =========================================================
       Clear previous active state
    ========================================================= */

    const clearCookie = (name: string, httpOnly = true) => {
      res.cookies.set(name, "", deleteCookieOptions(httpOnly, true));
      res.cookies.set(name, "", deleteCookieOptions(httpOnly, false));
    };

    const cookiesToClear = [
      "authToken",
      "token",
      "impersonationToken",

      // client readable
      "role",
      "hasPaid",
      "isTrial",
      "trialExpiresAt",
    ];

    for (const name of cookiesToClear) {
      const isHttpOnly =
        name === "authToken" ||
        name === "token" ||
        name === "impersonationToken";

      clearCookie(name, isHttpOnly);
    }

    /* =========================================================
       Save original staff token
    ========================================================= */

    res.cookies.set("producerStaffAuthToken", token, httpOnlyCookieOptions());

    /* =========================================================
       Set active impersonation session
    ========================================================= */

    res.cookies.set("authToken", impersonationToken, httpOnlyCookieOptions());

    // legacy support
    res.cookies.set("token", impersonationToken, httpOnlyCookieOptions());

    // explicit impersonation cookie
    res.cookies.set(
      "impersonationToken",
      impersonationToken,
      httpOnlyCookieOptions()
    );

    /* =========================================================
       Client-readable UX cookies
    ========================================================= */

    res.cookies.set(
      "role",
      String(targetUser.role || "client"),
      clientCookieOptions()
    );

    res.cookies.set("hasPaid", String(hasPaid), clientCookieOptions());

    res.cookies.set("isTrial", String(isTrial), clientCookieOptions());

    if (isTrial && targetUser.trialExpiresAt) {
      res.cookies.set(
        "trialExpiresAt",
        String(new Date(targetUser.trialExpiresAt).getTime()),
        clientCookieOptions()
      );
    } else {
      clearCookie("trialExpiresAt", false);
    }

    console.log(
      "✅ Producer staff impersonation:",
      String(staff._id),
      "-> target:",
      String(targetUser._id)
    );

    return res;
  } catch (err) {
    console.error("❌ producer-staff impersonate error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}