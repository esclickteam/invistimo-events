import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    // ===== בדיקת משתמש =====
    const user = await User.findOne({ email });
    if (!user)
      return NextResponse.json({ error: "מייל או סיסמה שגויים" }, { status: 401 });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return NextResponse.json({ error: "מייל או סיסמה שגויים" }, { status: 401 });

    // ===== יצירת טוקן =====
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    // ===== תשובה ללקוח =====
    const res = NextResponse.json({
      success: true,
      user: { _id: user._id, name: user.name, email: user.email },
      token,
    });

    // ======================================================
    // ✅ Cookie תקין שיישלח גם ב-fetch וגם יישאר אחרי רענון
    // ======================================================
    res.cookies.set("authToken", token, {
      httpOnly: true,         // לא נגיש מג׳אווהסקריפט
      secure: process.env.NODE_ENV === "production", // ב־https בלבד בפרודקשן
      sameSite: "lax",        // מאפשר שליחה ב־fetch רגיל
      path: "/",              // לכל האתר
      maxAge: 60 * 60 * 24 * 7, // שבוע
      // ⚠️ אל תגדירי domain — הדפדפן יקבע אוטומטית
    });

    return res;

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}
