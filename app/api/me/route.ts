import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  try {
    await connectDB();

    /* =====================================================
       🍪 Cookies (async בפרויקט הזה)
    ===================================================== */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    /* =====================================================
       🔐 Verify JWT
    ===================================================== */
    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (err) {
      console.error("❌ JWT לא תקין:", err);

      const res = NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );

      // 🔥 ניקוי מוחלט של cookies
      res.cookies.delete("authToken");
      res.cookies.delete("role");
      res.cookies.delete("isTrial");
      res.cookies.delete("trialExpiresAt");
      res.cookies.delete("smsUsed");
      res.cookies.delete("smsLimit");

      return res;
    }

    /* =====================================================
       👤 Fetch User
    ===================================================== */
    const user = await User.findById(decoded.userId).lean();

    if (!user) {
      const res = NextResponse.json(
        { success: false, user: null },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );

      res.cookies.delete("authToken");
      res.cookies.delete("role");

      return res;
    }

    console.log(
      "✅ ME:",
      user.email,
      "| role:",
      user.role,
      decoded.impersonatedByAdmin ? "| impersonated" : ""
    );

    /* =====================================================
       ✅ Success
    ===================================================== */
    return NextResponse.json(
      {
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,

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

          // 🕵️‍♂️ אדמין בתחזות
          impersonatedByAdmin: !!decoded.impersonatedByAdmin,
          adminId: decoded.adminId ?? null,

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
