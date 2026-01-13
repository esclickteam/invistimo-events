import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

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

    const user = await User.findOne({
      magicToken: token,
      magicTokenExpires: { $gt: Date.now() },
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

    user.password = await bcrypt.hash(password, 10);
    user.magicToken = undefined;
    user.magicTokenExpires = undefined;
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
