import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    console.log("🟢 SET PASSWORD API HIT");

    const body = await req.json();
    console.log("📦 BODY:", body);

    const { token, password } = body;

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

    console.log("🔎 SEARCHING USER WITH TOKEN:", token);

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

    console.log("⏰ TOKEN EXPIRES AT:", user.resetPasswordExpires);
    console.log("⏰ NOW:", new Date());

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      console.log("❌ TOKEN EXPIRED");
      return NextResponse.json(
        { success: false, message: "הקישור פג תוקף" },
        { status: 400 }
      );
    }

    console.log("🔐 needsPasswordSetup:", user.needsPasswordSetup);

    if (!user.needsPasswordSetup) {
      console.log("❌ PASSWORD ALREADY SET");
      return NextResponse.json(
        { success: false, message: "הסיסמה כבר הוגדרה עבור חשבון זה" },
        { status: 400 }
      );
    }

    console.log("🔑 HASHING PASSWORD...");
    user.password = await bcrypt.hash(password, 10);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.needsPasswordSetup = false;

    await user.save();

    console.log("✅ PASSWORD SAVED SUCCESSFULLY");

    return NextResponse.json({
      success: true,
      message: "הסיסמה הוגדרה בהצלחה 🎉",
    });
  } catch (error) {
    console.error("🔥 SET PASSWORD SERVER ERROR:", error);
    return NextResponse.json(
      { success: false, message: "שגיאה בשרת" },
      { status: 500 }
    );
  }
}
