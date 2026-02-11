import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/* =========================
   Cookie helper
========================= */
async function getCookieStore() {
  const store = cookies();
  return store instanceof Promise ? await store : store;
}

/* =========================
   Normalize role
========================= */
function normalizeImpersonatedRole(user: any): "producer" | "staff" | "client" {
  const rawRole = String(user?.role || "").toLowerCase();
  const staffType = String(user?.staffType || "").toLowerCase();

  // מפיק אמיתי
  if (rawRole === "producer") return "producer";

  // עובד מפיק
  if (rawRole === "staff") return "staff";
  if (rawRole === "user" && (staffType === "producer-staff" || staffType === "staff")) {
    return "staff";
  }

  // כל היתר = לקוח/משתמש רגיל
  return "client";
}

/* =========================
   POST /api/admin/impersonate
========================= */
export async function POST(req: Request) {
  try {
    await connectDB();

    const cookieStore = await getCookieStore();

    const adminToken =
      cookieStore.get("authToken")?.value ||
      cookieStore.get("token")?.value ||
      null;

    if (!adminToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    /* =========================
       🔐 Verify admin token
    ========================= */
    const decoded: any = jwt.verify(adminToken, process.env.JWT_SECRET!);

    if (decoded.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    /* =========================
       📥 Body
    ========================= */
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    /* =========================
       👤 Target user
    ========================= */
    const user = await User.findById(userId).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const impersonatedRole = normalizeImpersonatedRole(user);
    const staffType = user?.staffType ?? null;
    const producerId = user?.producerId ? String(user.producerId) : null;

    /* =========================
       🎭 Impersonation Token
========================= */
    const impersonationToken = jwt.sign(
      {
        userId: String(user._id),

        // ⚠️ חשוב: role מנורמל כדי שכל המערכת תתנהג נכון
        role: impersonatedRole, // "producer" | "staff" | "client"

        // מידע משלים
        originalRole: user?.role ?? null,
        staffType,
        producerId,

        impersonated: true,
        impersonatedBy: decoded.userId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "30m" }
    );

    const res = NextResponse.json({
      success: true,
      impersonatedRole, // ✅ זה השדה שהקליינט צריך לקרוא
      role: impersonatedRole, // נשאיר גם compatibility
      staffType,
      producerId,
    });

    /* =========================
       🧠 שמירת טוקן אדמין
    ========================= */
    res.cookies.set("adminToken", adminToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    /* =========================
       🔁 החלפת auth token
    ========================= */
    res.cookies.set("authToken", impersonationToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    res.cookies.set("token", impersonationToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (err) {
    console.error("❌ Admin impersonation error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
