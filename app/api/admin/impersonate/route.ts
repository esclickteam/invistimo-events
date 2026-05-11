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

  // מחיקה עם domain
  res.cookies.set(name, "", {
    ...base,
    ...(domain ? { domain } : {}),
    httpOnly,
  });

  // מחיקה גם בלי domain
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

  hasPaid?: boolean;
  isTrial?: boolean;

  impersonated?: boolean;
  impersonatedBy?: string;
  impersonatedByAdmin?: boolean;
  adminId?: string;
  impersonationRole?: string;

  iat?: number;
  exp?: number;
};

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

    /*
      חשוב:
      תומך גם בשמות החדשים וגם בשמות הישנים.
      אצלך בקוד יש adminToken וגם adminAuthToken, לכן לא מוחקים תמיכה באף אחד כרגע.
    */
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
      decoded = jwt.verify(
        adminToken,
        process.env.JWT_SECRET
      ) as JwtPayload;
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

    /*
      אם האדמין כבר היה במצב התחזות,
      נזהה את האדמין המקורי לפי impersonatedBy.
    */
    const adminUserId = String(
      decoded?.impersonatedBy ||
        decoded?.adminId ||
        decoded?.userId ||
        decoded?.id ||
        decoded?._id ||
        ""
    );

    const actingRole = decoded?.role;

    const isAdmin =
      actingRole === "admin" ||
      decoded?.impersonationRole === "admin" ||
      !!decoded?.impersonatedBy ||
      !!decoded?.impersonatedByAdmin;

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
    const userId = body?.userId;

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
        "_id role staffType producerId assignedProducerId createdByProducer email name hasPaid isTrial trialExpiresAt"
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

    /* =========================
       Resolve target role
    ========================= */

    const targetEffectiveRole =
      user.role === "producer"
        ? "producer"
        : user.role === "staff" && user.staffType === "producer_staff"
        ? "producer_staff"
        : user.role || "user";

    const hasPaid = user.hasPaid ?? true;
    const isTrial = Boolean(user.isTrial);

    /* =========================
       Impersonation Token
    ========================= */

    const impersonationToken = jwt.sign(
      {
        userId: String(user._id),
        role: user.role || "user",
        staffType: user.staffType ?? null,

        producerId: user.producerId ? String(user.producerId) : null,
        assignedProducerId: user.assignedProducerId
          ? String(user.assignedProducerId)
          : null,
        createdByProducer: user.createdByProducer ?? null,

        hasPaid,
        isTrial,

        impersonated: true,
        impersonatedBy: adminUserId,
        impersonatedByAdmin: true,
        adminId: adminUserId,

        /*
          חשוב:
          ב-/api/me אצלך משתמשים ב-impersonationRole כדי להבין מצב התחזות.
          נשאיר admin כדי לדעת שזה הגיע מאדמין.
        */
        impersonationRole: "admin",

        /*
          תפקיד המשתמש שאליו התחזו.
        */
        originalTargetRole: targetEffectiveRole,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: SESSION_EXPIRES_IN,
      }
    );

    const res = NextResponse.json(
      {
        success: true,
        role: user.role || "user",
        staffType: user.staffType ?? null,
        impersonationRole: "admin",
        originalTargetRole: targetEffectiveRole,
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

      // client-readable old UX cookies
      "hasPaid",
      "isTrial",
      "trialExpiresAt",
      "role",
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
       שומרים בשני השמות כדי לא לשבור קוד קיים
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
       לא אבטחה — רק תצוגה/UX
    ========================= */

    res.cookies.set("role", String(user.role || "user"), cookieOptions(false));

    res.cookies.set("hasPaid", String(hasPaid), cookieOptions(false));

    res.cookies.set("isTrial", String(isTrial), cookieOptions(false));

    if (isTrial && user.trialExpiresAt) {
      res.cookies.set("trialExpiresAt", String(user.trialExpiresAt.getTime()), {
        ...cookieOptions(false),
      });
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