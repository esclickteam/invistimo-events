import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { name, email, password, createdByProducer } = await req.json();

    /* ============================================================
       Validation
    ============================================================ */
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "נא למלא את כל השדות" },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "המייל כבר קיים במערכת" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    /* ============================================================
       Create user – NO PAYMENT STATE HERE
       Stripe webhook is the source of truth
    ============================================================ */
    const user = await User.create({
  name,
  email,
  password: hashedPassword,

  role: "user",

  // ✅ enum חוקי
  plan: "basic",

  // ❌ עדיין לא שילם
  hasPaid: false,
  paidAmount: 0,

  // 🆕 קריטי – לקוח חדש
  isActive: false,

  // אם את עדיין רוצה Trial לוגי (לא legacy)
  isTrial: true,

  // ❌ אין חבילה / אין מודל הודעות ישן
  guests: 0,
  maxMessages: 0,
  remainingMessages: 0,
  smsBalance: 0,

  includeCalls: false,
  includeCreditGifts: false,

  createdByProducer: Boolean(createdByProducer),
  needsPasswordSetup: !createdByProducer,
});


    /* ============================================================
       If created by producer – NO LOGIN
    ============================================================ */
    if (createdByProducer) {
      return NextResponse.json({
        success: true,
        userId: user._id,
      });
    }

    /* ============================================================
       Regular signup – issue JWT
    ============================================================ */
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const res = NextResponse.json({
      success: true,
      userId: user._id,
    });

    res.cookies.set("authToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".invistimo.com",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json(
      { error: "שגיאה בשרת" },
      { status: 500 }
    );
  }
}
