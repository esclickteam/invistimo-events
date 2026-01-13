import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    /* ================= VALIDATION ================= */
    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: "חסרים נתונים" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "הסיסמה חייבת להכיל לפחות 6 תווים" },
        { status: 400 }
      );
    }

    await connectDB();

    /* ================= FIND USER ================= */
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "הקישור אינו תקף או שפג תוקפו" },
        { status: 400 }
      );
    }

    if (!user.needsPasswordSetup) {
      return NextResponse.json(
        { success: false, message: "הסיסמה כבר הוגדרה עבור חשבון זה" },
        { status: 400 }
      );
    }

    /* ================= UPDATE PASSWORD ================= */
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.needsPasswordSetup = false;

    await user.save();

    return NextResponse.json({
      success: true,
      message: "הסיסמה הוגדרה בהצלחה 🎉",
    });
  } catch (error) {
    console.error("❌ set-password error:", error);
    return NextResponse.json(
      { success: false, message: "שגיאה בשרת" },
      { status: 500 }
    );
  }
}
