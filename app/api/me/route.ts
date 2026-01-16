import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/* =========================
   Cookie helper (TS-safe)
========================= */
async function getCookieStore() {
  const store = cookies();
  return store instanceof Promise ? await store : store;
}

/* =========================
   GET /api/me
========================= */
export async function GET() {
  try {
    await connectDB();

    const cookieStore = await getCookieStore();

    const token =
      cookieStore.get("authToken")?.value ||
      cookieStore.get("token")?.value ||
      null;

    if (!token) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (err) {
      console.error("❌ JWT לא תקין:", err);

      const res = NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );

      // ניקוי cookie
      res.cookies.set("authToken", "", {
        path: "/",
        maxAge: 0,
      });
      res.cookies.set("token", "", {
        path: "/",
        maxAge: 0,
      });

      return res;
    }

    /* =========================
       Base user lookup
    ========================= */
    const baseUserId =
      decoded.userId || decoded.id || decoded._id || null;

    if (!baseUserId) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const user = await User.findById(baseUserId).lean();

    if (!user) {
      const res = NextResponse.json(
        { success: false, user: null },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );

      res.cookies.set("authToken", "", {
        path: "/",
        maxAge: 0,
      });
      res.cookies.set("token", "", {
        path: "/",
        maxAge: 0,
      });

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

          // 🔑 role מגיע מה-JWT (קריטי בהתחזות)
          role: decoded.role,

          // 📦 תכנית וחיובים
          plan: user.plan,
          guests: user.guests,
          paidAmount: user.paidAmount,
          planLimits: user.planLimits,

          // 📞 שיחות
          includeCalls: user.includeCalls,
          callsRounds: user.callsRounds,
          callsAddonPrice: user.callsAddonPrice,

          // 💳 מתנות באשראי
          includeCreditGifts: user.includeCreditGifts,
          creditGiftsAddonPrice: user.creditGiftsAddonPrice,

          // 🧪 סטטוסים
          isTrial: user.isTrial,
          isDemoUser: user.isDemoUser,

          // 🕵️‍♂️ impersonation (חדש, כללי)
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
