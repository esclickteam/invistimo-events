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

  // תאימות לאחור
  res.cookies.set("token", "", {
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

    // ✅ חובה await
    const cookieStore = await cookies();

    /* =========================
       🔐 Token priority
    ========================= */
    const impersonationToken =
      cookieStore.get("impersonationToken")?.value ?? null;

    const authToken =
      cookieStore.get("authToken")?.value ??
      cookieStore.get("token")?.value ??
      null;

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

      impersonated?: boolean;
      impersonatedBy?: string;
      impersonationRole?: "admin" | "producer";

      legacyRole?: string;
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

    /* =========================
       🧠 Role normalization
    ========================= */
    const rawRole = decoded.role ?? "user";
    const normalizedRole = rawRole === "client" ? "user" : rawRole;

    console.log(
      "✅ ME:",
      user.email,
      "| role:",
      normalizedRole,
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

          /* 🔑 AUTH */
          role: normalizedRole,
          legacyRole: rawRole !== normalizedRole ? rawRole : undefined,

          impersonated: !!decoded.impersonated,
          impersonatedBy: decoded.impersonatedBy ?? null,
          impersonationRole: decoded.impersonationRole ?? null,

          createdByProducer: !!user.createdByProducer,

          /* 📦 BUSINESS */
          plan: user.plan,
          subscriptionPlan: user.plan,   // alias
          guests: user.guests,
          paidAmount: user.paidAmount,
          hasPaid: user.hasPaid,
          isPaid: user.hasPaid,           // alias
          planLimits: user.planLimits,

          /* 📞 CALLS */
          includeCalls: user.includeCalls,
          callsRounds: user.callsRounds,
          callsAddonPrice: user.callsAddonPrice,

          /* 💳 GIFTS */
          includeCreditGifts: user.includeCreditGifts,
          creditGiftsAddonPrice: user.creditGiftsAddonPrice,

          /* 🧪 STATUS */
          isTrial: user.isTrial,
          isDemoUser: user.isDemoUser,

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
