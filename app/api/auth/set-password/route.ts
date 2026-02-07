import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    console.log("🟢 SET PASSWORD API HIT");

    const body = await req.json();
    console.log("📦 BODY:", body);

    const { token, password } = body;

    /* =========================
       VALIDATION
    ========================= */
    if (!token || !password) {
      console.log("❌ MISSING DATA", { token, password });
      return NextResponse.json(
        { success: false, message: "חסרים נתונים" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      console.log("❌ PASSWORD TOO SHORT");
      return NextResponse.json(
        { success: false, message: "הסיסמה חייבת להכיל לפחות 6 תווים" },
        { status: 400 }
      );
    }

    await connectDB();
    console.log("✅ DB CONNECTED");

    /* =========================
       FIND USER BY TOKEN
    ========================= */
    const user = await User.findOne({
      resetPasswordToken: token,
    });

    console.log("👤 USER FOUND:", user ? user._id : null);

    if (!user) {
      console.log("❌ NO USER WITH TOKEN");
      return NextResponse.json(
        { success: false, message: "הקישור אינו תקף או שפג תוקפו" },
        { status: 400 }
      );
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      console.log("❌ TOKEN EXPIRED");
      return NextResponse.json(
        { success: false, message: "הקישור פג תוקף" },
        { status: 400 }
      );
    }

    if (!user.needsPasswordSetup) {
      console.log("❌ PASSWORD ALREADY SET");
      return NextResponse.json(
        { success: false, message: "הסיסמה כבר הוגדרה עבור חשבון זה" },
        { status: 400 }
      );
    }

    /* =========================
       SET PASSWORD
    ========================= */
    console.log("🔑 HASHING PASSWORD...");
    user.password = await bcrypt.hash(password, 10);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.needsPasswordSetup = false;

    await user.save();
    console.log("✅ PASSWORD SAVED");

    /* =========================
       CREATE JWT
    ========================= */
    const authToken = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    /* =========================
       RESPONSE + COOKIE
    ========================= */
    const response = NextResponse.json({
      success: true,
      message: "הסיסמה הוגדרה בהצלחה 🎉",
      redirectTo:
        user.role === "producer"
          ? "/producer/dashboard"
          : "/dashboard",
    });

    response.cookies.set({
      name: "authToken",
      value: authToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 ימים
    });

    console.log("🍪 AUTH COOKIE SET");

    return response;
  } catch (error) {
    console.error("🔥 SET PASSWORD SERVER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "שגיאה בשרת" },
      { status: 500 }
    );
  }
}
