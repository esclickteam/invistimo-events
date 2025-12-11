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
      { expiresIn: "7d" }
    );

    const res = NextResponse.json({ success: true });

    // ========== ⚠️ הגדרות Cookie שמתאימות לפרודקשן ==========
    res.cookies.set("authToken", token, {
      httpOnly: true,
      secure: true,              // חובה בפרודקשן
      sameSite: "none",          // חובה בפרודקשן
      domain: ".invistimo.com",  // מאפשר שליחה גם מ-www
      path: "/",
      maxAge: 60 * 60 * 24 * 7,  // שבוע
    });

    return res;

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}
