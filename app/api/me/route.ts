import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, user: null },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // ✅ פענוח JWT
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // ✅ טעינת המשתמש בלי סיסמה
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return NextResponse.json(
        { success: false, user: null },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // ✅ החזרת השדות הדרושים לדשבורד
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      guests: user.guests,
      paidAmount: user.paidAmount,
      planLimits: user.planLimits,
      includeCalls: user.includeCalls || false,
      callsAddonPrice: user.callsAddonPrice || 0,
      createdAt: user.createdAt,
    };

    return NextResponse.json(
      { success: true, user: userData },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("❌ /api/me error:", error);
    return NextResponse.json(
      { success: false, user: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
