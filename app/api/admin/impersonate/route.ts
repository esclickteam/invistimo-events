import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { beginAdminCustomerSession } from "@/lib/admin/customerAccountSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================
   Constants
========================= */

async function getCookieStore() {
  try {
    const store = cookies();
    return store instanceof Promise ? await store : store;
  } catch {
    return null;
  }
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

    const fromRequest = (name: string) => {
      const header = req.headers.get("cookie") || "";
      for (const part of header.split(";")) {
        const trimmed = part.trim();
        if (!trimmed.startsWith(`${name}=`)) continue;
        const raw = trimmed.slice(name.length + 1);
        try {
          return decodeURIComponent(raw);
        } catch {
          return raw;
        }
      }
      return "";
    };

    const adminToken =
      fromRequest("adminAuthToken") ||
      fromRequest("adminToken") ||
      fromRequest("authToken") ||
      fromRequest("token") ||
      cookieStore?.get("adminAuthToken")?.value ||
      cookieStore?.get("adminToken")?.value ||
      cookieStore?.get("authToken")?.value ||
      cookieStore?.get("token")?.value ||
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

    /*
      אותה כניסה כמו "ניהול משתמש כאדמין":
      הסשן הפעיל הוא הלקוח עצמו, והאדמין נשמר רק כדי לחזור לניהול.
    */
    return beginAdminCustomerSession({
      adminUserId,
      adminToken,
      targetUserId: userId,
    });
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