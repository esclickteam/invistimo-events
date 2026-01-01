import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  try {
    await connectDB();

    const cookieStore = await cookies();
const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      // 🔥 טוקן לא תקין → מחיקה
      const res = NextResponse.json(
        { success: false, user: null },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );

      res.cookies.set("authToken", "", {
        path: "/",
        domain: ".invistimo.com",
        maxAge: 0,
      });

      return res;
    }

    const user = await User.findById(decoded.userId).lean();

    if (!user) {
      const res = NextResponse.json(
        { success: false, user: null },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );

      res.cookies.set("authToken", "", {
        path: "/",
        domain: ".invistimo.com",
        maxAge: 0,
      });

      return res;
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,

          // 🔐 הרשאות
          role: user.role,

          // 💳 חבילה
          plan: user.plan,
          guests: user.guests,
          paidAmount: user.paidAmount,

          // 📦 מגבלות
          planLimits: user.planLimits,

          // ☎️ שיחות
          includeCalls: user.includeCalls,
          callsRounds: user.callsRounds,
          callsAddonPrice: user.callsAddonPrice,

          // 🧪 מצבים
          isTrial: user.isTrial,
          isDemoUser: user.isDemoUser,

          createdAt: user.createdAt,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("ME API ERROR:", err);
    return NextResponse.json(
      { success: false, user: null },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
