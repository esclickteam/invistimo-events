import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/* =========================
   Helpers
========================= */
function clearAuthCookie(res: NextResponse) {
  res.cookies.set("authToken", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  res.cookies.set("impersonationToken", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

/* =========================
   GET /api/me
========================= */
export async function GET() {
  try {
    await connectDB();

    const cookieStore = await cookies();

    // 🔐 סדר עדיפויות נכון
    const impersonationToken =
      cookieStore.get("impersonationToken")?.value ?? null;

    const authToken =
      cookieStore.get("authToken")?.value ?? null;

    const token = impersonationToken ?? authToken;

    if (!token) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    let decoded: {
      userId?: string;
      id?: string;
      _id?: string;
      role?: "admin" | "producer" | "client" | "user";

      // impersonation flags
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

      clearAuthCookie(res);
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

      clearAuthCookie(res);
      return res;
    }

    const user = await User.findById(baseUserId).lean();

    if (!user) {
      const res = NextResponse.json(
        { success: false, user: null },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );

      clearAuthCookie(res);
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

          createdByProducer: user.createdByProducer === true,
          
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

          // 🕵️‍♂️ impersonation
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
