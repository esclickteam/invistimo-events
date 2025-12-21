import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    const user = await User.findOne({ email });
    if (!user)
      return NextResponse.json(
        { error: "מייל או סיסמה שגויים" },
        { status: 401 }
      );

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return NextResponse.json(
        { error: "מייל או סיסמה שגויים" },
        { status: 401 }
      );

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" } // ⏱️ מומלץ
    );

    const res = NextResponse.json({
      success: true,
      user: { _id: user._id, name: user.name, email: user.email },
    });

    // ✅ Session Cookie – נעלם בסגירת טאב / דפדפן
    res.cookies.set("authToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}
