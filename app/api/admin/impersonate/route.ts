import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  };
}

function expireCookie(
  res: NextResponse,
  name: string,
  httpOnly = true
) {
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
   POST /api/admin/impersonate
========================= */
export async function POST(req: Request) {
  try {
    await connectDB();

    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { success: false, error: "JWT_SECRET_MISSING" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const cookieStore = await getCookieStore();

    const adminToken =
      cookieStore.get("authToken")?.value ||
      cookieStore.get("token")?.value ||
      cookieStore.get("adminToken")?.value ||
      null;

    if (!adminToken) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    /* =========================
       🔐 Verify admin token
    ========================= */
    const decoded: any = jwt.verify(adminToken, process.env.JWT_SECRET);

    // אם כבר יש התחזות פעילה, נשמור את האדמין המקורי
    const adminUserId = String(
      decoded?.impersonatedBy ||
        decoded?.userId ||
        decoded?.id ||
        decoded?._id ||
        ""
    );

    const actingRole = decoded?.role;
    const isAdmin =
      actingRole === "admin" ||
      decoded?.impersonationRole === "admin" ||
      !!decoded?.impersonatedBy;

    if (!isAdmin || !adminUserId) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    // אימות שהמשתמש באמת אדמין במסד
    const adminUser = await User.findById(adminUserId)
      .select("_id role")
      .lean();

    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    /* =========================
       📥 Body
    ========================= */
    const body = await req.json().catch(() => ({} as any));
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "MISSING_USER_ID" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    /* =========================
       👤 Target user
    ========================= */
    const user: any = await User.findById(userId)
      .select(
        "_id role staffType producerId assignedProducerId createdByProducer email name hasPaid"
      )
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    /* =========================
       🎭 Resolve impersonationRole
    ========================= */
    const impersonationRole =
      user.role === "producer"
        ? "producer"
        : user.role === "staff" && user.staffType === "producer_staff"
        ? "producer_staff"
        : user.role || "user";

    /* =========================
       🎭 Impersonation Token
    ========================= */
    const impersonationToken = jwt.sign(
      {
        userId: String(user._id),
        role: user.role,
        staffType: user.staffType ?? null,

        producerId: user.producerId ?? null,
        assignedProducerId: user.assignedProducerId ?? null,
        createdByProducer: user.createdByProducer ?? null,

        hasPaid: user.hasPaid ?? true,

        impersonated: true,
        impersonatedBy: adminUserId,
        impersonatedByAdmin: true,
        impersonationRole: "admin",
        originalTargetRole: impersonationRole,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    const res = NextResponse.json(
      {
        success: true,
        role: user.role,
        staffType: user.staffType ?? null,
        impersonationRole,
        impersonatedBy: adminUserId,
      },
      { headers: { "Cache-Control": "no-store" } }
    );

    /* =========================
       🧹 ניקוי מצב קודם
    ========================= */
    expireCookie(res, "authToken", true);
    expireCookie(res, "token", true);
    expireCookie(res, "impersonationToken", true);
    expireCookie(res, "hasPaid", false);

    /* =========================
       🧠 שמירת טוקן אדמין
    ========================= */
    res.cookies.set("adminToken", adminToken, cookieOptions(true));

    /* =========================
       🔁 החלפת auth tokens
    ========================= */
    res.cookies.set("authToken", impersonationToken, cookieOptions(true));
    res.cookies.set("token", impersonationToken, cookieOptions(true));
    res.cookies.set(
      "impersonationToken",
      impersonationToken,
      cookieOptions(true)
    );

    // client-readable
    res.cookies.set("hasPaid", String(user.hasPaid ?? true), cookieOptions(false));

    return res;
  } catch (err) {
    console.error("❌ Admin impersonation error:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}