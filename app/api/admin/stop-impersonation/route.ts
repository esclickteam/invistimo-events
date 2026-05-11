import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================
   Constants
========================= */

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 ימים
const SESSION_EXPIRES_IN = "7d";

/* =========================
   Types
========================= */

type DecodedToken = {
  userId?: string;
  id?: string;
  _id?: string;
  role?: string;

  // Legacy impersonation
  impersonatedByAdmin?: boolean;
  adminId?: string;

  // Modern impersonation
  impersonated?: boolean;
  impersonationRole?: string;
  impersonatedBy?: string;

  hasPaid?: boolean;
  iat?: number;
  exp?: number;
};

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

function setExpiredCookie(
  res: NextResponse,
  name: string,
  opts?: { domain?: string; httpOnly?: boolean }
) {
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
    ...(opts?.domain ? { domain: opts.domain } : {}),
    httpOnly: opts?.httpOnly ?? true,
  });

  // מחיקה גם בלי domain
  res.cookies.set(name, "", {
    ...base,
    httpOnly: opts?.httpOnly ?? true,
  });
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

function verifyFirstValidToken(
  tokens: Array<{ source: string; value: string | null }>,
  secret: string
): { decoded: DecodedToken; source: string } | null {
  let lastError: unknown = null;

  for (const item of tokens) {
    if (!item.value) continue;

    try {
      const decoded = jwt.verify(item.value, secret) as DecodedToken;

      return {
        decoded,
        source: item.source,
      };
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Invalid token skipped: ${item.source}`, err);
    }
  }

  if (lastError) {
    console.error("❌ No valid token found. Last error:", lastError);
  }

  return null;
}

/* =========================
   POST /api/admin/stop-impersonation
========================= */

export async function POST() {
  try {
    await connectDB();

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET missing");

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

    /* =========================
       Read all relevant cookies
    ========================= */

    const authToken = cookieStore.get("authToken")?.value || null;
    const adminAuthToken = cookieStore.get("adminAuthToken")?.value || null;
    const adminToken = cookieStore.get("adminToken")?.value || null;
    const impersonationToken =
      cookieStore.get("impersonationToken")?.value || null;
    const legacyToken = cookieStore.get("token")?.value || null;

    const hasAnyToken =
      !!authToken ||
      !!adminAuthToken ||
      !!adminToken ||
      !!impersonationToken ||
      !!legacyToken;

    if (!hasAnyToken) {
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

    /*
      קודם מנסים את טוקן ההתחזות הפעיל,
      ואז authToken/token,
      ואז adminAuthToken/adminToken.
    */
    const tokenResult = verifyFirstValidToken(
      [
        { source: "impersonationToken", value: impersonationToken },
        { source: "authToken", value: authToken },
        { source: "token", value: legacyToken },
        { source: "adminAuthToken", value: adminAuthToken },
        { source: "adminToken", value: adminToken },
      ],
      process.env.JWT_SECRET
    );

    if (!tokenResult?.decoded) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_TOKEN",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const decoded = tokenResult.decoded;

    /* =========================
       Validate impersonation state
    ========================= */

    const legacyImpersonation =
      !!decoded.impersonatedByAdmin && !!decoded.adminId;

    const modernImpersonation =
      decoded.impersonated === true &&
      String(decoded.impersonationRole || "").toLowerCase() === "admin" &&
      !!decoded.impersonatedBy;

    const hasStoredAdminToken = !!adminAuthToken || !!adminToken;

    if (!legacyImpersonation && !modernImpersonation && !hasStoredAdminToken) {
      return NextResponse.json(
        {
          success: false,
          error: "NOT_IMPERSONATING",
        },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    /*
      מקור האדמין:
      1. adminId בפורמט ישן
      2. impersonatedBy בפורמט חדש
      3. אם יש admin token שמור, נפענח אותו וניקח ממנו userId
    */
    let adminId = decoded.adminId || decoded.impersonatedBy || null;

    if (!adminId && (adminAuthToken || adminToken)) {
      const storedAdminResult = verifyFirstValidToken(
        [
          { source: "adminAuthToken", value: adminAuthToken },
          { source: "adminToken", value: adminToken },
        ],
        process.env.JWT_SECRET
      );

      adminId =
        storedAdminResult?.decoded?.userId ||
        storedAdminResult?.decoded?.id ||
        storedAdminResult?.decoded?._id ||
        null;
    }

    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_ADMIN_REFERENCE",
        },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    /* =========================
       Verify admin in DB
    ========================= */

    const admin: any = await User.findById(adminId)
      .select(
        "_id name email role hasPaid isTrial trialExpiresAt smsUsed planLimits"
      )
      .lean();

    if (!admin || admin.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "ADMIN_NOT_FOUND",
        },
        {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    /* =========================
       Create fresh admin token
    ========================= */

    const newAdminToken = jwt.sign(
      {
        userId: String(admin._id),
        role: "admin",
        hasPaid: true,
        isTrial: false,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: SESSION_EXPIRES_IN,
      }
    );

    const res = NextResponse.json(
      {
        success: true,
        role: "admin",
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );

    const domain = getCookieDomain();

    /* =========================
       Clear impersonation / old cookies
    ========================= */

    const cookiesToClear = [
      "authToken",
      "token",
      "impersonationToken",
      "adminToken",
      "adminAuthToken",
      "producerAuthToken",

      // client-readable UX cookies
      "role",
      "hasPaid",
      "isTrial",
      "trialExpiresAt",
      "smsUsed",
      "smsLimit",
    ];

    for (const name of cookiesToClear) {
      const isHttpOnly =
        name === "authToken" ||
        name === "token" ||
        name === "impersonationToken" ||
        name === "adminToken" ||
        name === "adminAuthToken" ||
        name === "producerAuthToken";

      setExpiredCookie(res, name, {
        domain,
        httpOnly: isHttpOnly,
      });
    }

    /* =========================
       Restore admin session
       שומרים גם בשם החדש וגם בשם הישן כדי לא לשבור קוד קיים
    ========================= */

    res.cookies.set("authToken", newAdminToken, cookieOptions(true));
    res.cookies.set("adminAuthToken", newAdminToken, cookieOptions(true));
    res.cookies.set("adminToken", newAdminToken, cookieOptions(true));

    /* =========================
       Client-readable UX cookies
    ========================= */

    res.cookies.set("role", "admin", cookieOptions(false));

    res.cookies.set("hasPaid", "true", cookieOptions(false));

    res.cookies.set("isTrial", "false", cookieOptions(false));

    res.cookies.set("smsUsed", String(admin.smsUsed ?? 0), cookieOptions(false));

    res.cookies.set(
      "smsLimit",
      String(admin.planLimits?.smsLimit ?? 0),
      cookieOptions(false)
    );

    console.log(
      "✅ Stop impersonation restored admin:",
      admin.email,
      "| tokenSource:",
      tokenResult.source
    );

    return res;
  } catch (err) {
    console.error("❌ Stop impersonation error:", err);

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