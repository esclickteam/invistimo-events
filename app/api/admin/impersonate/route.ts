import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================
   Cookie helper
========================= */
async function getCookieStore() {
  const store = cookies();
  return store instanceof Promise ? await store : store;
}

function cookieOptions() {
  return {
    path: "/",
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
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
        { status: 500 }
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
        { status: 401 }
      );
    }

    /* =========================
       🔐 Verify admin token
    ========================= */
    const decoded: any = jwt.verify(adminToken, process.env.JWT_SECRET);

    // אם מנסים להתחיל התחזות מתוך טוקן התחזות, נשתמש במזהה האדמין המקורי
    const adminUserId = String(decoded?.impersonatedBy || decoded?.userId || decoded?.id || decoded?._id || "");

    const actingRole = decoded?.role;
    const isAdmin =
      actingRole === "admin" ||
      decoded?.impersonationRole === "admin" ||
      !!decoded?.impersonatedBy;

    if (!isAdmin || !adminUserId) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // מאמתים שאכן המשתמש הוא אדמין במסד
    const adminUser = await User.findById(adminUserId).select("_id role").lean();
    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
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
        { status: 400 }
      );
    }

    /* =========================
       👤 Target user
    ========================= */
    const user: any = await User.findById(userId)
      .select("_id role staffType producerId assignedProducerId createdByProducer email name")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
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
        : "admin"; // fallback שמונע null

    /* =========================
       🎭 Impersonation Token
    ========================= */
    const impersonationToken = jwt.sign(
      {
        userId: String(user._id),
        role: user.role, // user / producer / staff / client
        staffType: user.staffType ?? null,

        producerId: user.producerId ?? null,
        assignedProducerId: user.assignedProducerId ?? null,
        createdByProducer: user.createdByProducer ?? null,

        impersonated: true,
        impersonatedBy: adminUserId,      // האדמין האמיתי
        impersonationRole,                // ✅ קריטי: לא יהיה null
      },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    const res = NextResponse.json({
      success: true,
      role: user.role,
      staffType: user.staffType ?? null,
      impersonationRole,
      impersonatedBy: adminUserId,
    });

    /* =========================
       🧠 שמירת טוקן אדמין
    ========================= */
    res.cookies.set("adminToken", adminToken, cookieOptions());

    /* =========================
       🔁 החלפת auth tokens
    ========================= */
    res.cookies.set("authToken", impersonationToken, cookieOptions());
    res.cookies.set("token", impersonationToken, cookieOptions());

    // תאימות למסלולים שמשתמשים בטוקן התחזות ייעודי
    res.cookies.set("impersonationToken", impersonationToken, cookieOptions());

    return res;
  } catch (err) {
    console.error("❌ Admin impersonation error:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
