import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/* =========================
   Helpers
========================= */
function clearAuthCookies(res: NextResponse) {
  const cookieDomain =
    process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;

  const baseCookie = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    domain: cookieDomain,
  };

  const delHttpOnly = {
    ...baseCookie,
    httpOnly: true,
    maxAge: 0,
  };

  // 🔐 מוחקים את כל טוקני האימות
  res.cookies.set("authToken", "", delHttpOnly);
  res.cookies.set("producerAuthToken", "", delHttpOnly);
}

/* =========================
   GET /api/me
========================= */
export async function GET() {
  try {
    await connectDB();

    const cookieStore = await cookies();

    /* =====================================================
       🔐 מקור אמת יחיד – producer גובר
    ===================================================== */
    const producerToken =
      cookieStore.get("producerAuthToken")?.value ?? null;

    const authToken =
      cookieStore.get("authToken")?.value ?? null;

    const token = producerToken ?? authToken;

    if (!token) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    /* =====================================================
       🚨 מצב לא חוקי – שני טוקנים יחד
    ===================================================== */
    if (producerToken && authToken) {
      const res = NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
      clearAuthCookies(res);
      return res;
    }

    let decoded: {
      userId?: string;
      id?: string;
      _id?: string;
      role?: "admin" | "producer" | "client" | "user";

      // impersonation flags (לוגיים בלבד)
      impersonated?: boolean;
      impersonatedBy?: string;
      impersonationRole?: "admin" | "producer";
    };

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    } catch (err) {
      console.error("❌ JWT לא תקין:", err);

      const res = NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );

      clearAuthCookies(res);
      return res;
    }

    /* =========================
       Base user lookup
    ========================= */
    const baseUserId =
      decoded.userId ||
      decoded.id ||
      decoded._id ||
      null;

    if (!baseUserId) {
      const res = NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );

      clearAuthCookies(res);
      return res;
    }

    const user = await User.findById(baseUserId).lean();

    if (!user) {
      const res = NextResponse.json(
        { success: false, user: null },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );

      clearAuthCookies(res);
      return res;
    }

    console.log(
      "✅ ME:",
      user.email,
      "| role:",
      decoded.role,
      decoded.impersonated ? "| impersonated" : ""
    );

    /* =========================
       Response
    ========================= */
    return NextResponse.json(
      {
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,

          // 🔑 role תמיד מה-JWT
          role: decoded.role ?? "user",

          createdByProducer: !!user.createdByProducer,

          // 📦 עסקי
          plan: user.plan,
          guests: user.guests,
          paidAmount: user.paidAmount,
          planLimits: user.planLimits,

          // 📞 שיחות
          includeCalls: user.includeCalls,
          callsRounds: user.callsRounds,
          callsAddonPrice: user.callsAddonPrice,

          // 💳 מתנות
          includeCreditGifts: user.includeCreditGifts,
          creditGiftsAddonPrice: user.creditGiftsAddonPrice,

          // 🧪 סטטוסים
          isTrial: user.isTrial,
          isDemoUser: user.isDemoUser,

          // 🕵️‍♂️ impersonation (לוגי בלבד)
          impersonated: !!decoded.impersonated,
          impersonatedBy: decoded.impersonatedBy ?? null,
          impersonationRole: decoded.impersonationRole ?? null,

          createdAt: user.createdAt,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("❌ ME API ERROR:", err);
    return NextResponse.json(
      { success: false, user: null },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
