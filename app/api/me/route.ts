import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  try {
    await connectDB();

    // ✅ שימי לב להבדל — כאן באמת יש await
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      console.log("❌ אין טוקן בכלל");
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

      res.cookies.set("authToken", "", {
        path: "/",
        domain: "www.invistimo.com",
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
        domain: "www.invistimo.com",
        maxAge: 0,
      });

      return res;
    }

    console.log("✅ משתמש אותר:", user.email, "| role:", user.role);

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
          includeCalls: user.includeCalls,
          callsRounds: user.callsRounds,
          callsAddonPrice: user.callsAddonPrice,
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
