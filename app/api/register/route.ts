import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await connectDB();

    const {
      name,
      email,
      password,
      createdByProducer,
    } = await req.json();

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

    const hashed = await bcrypt.hash(password, 12);

    /* ============================================================
       יצירת משתמש – ללא תשלום (Stripe הוא מקור האמת)
    ============================================================ */
    const user = await User.create({
      name,
      email,
      password: hashed,

      // ✅ enum חוקי
      plan: "basic",

      // ❗ עדיין לא משולם
      hasPaid: false,
      paidAmount: 0,
      isTrial: true,

      guests: 0,
      maxMessages: 0,
      remainingMessages: 0,

      createdByProducer: createdByProducer || null,
      needsPasswordSetup: !createdByProducer,
    });

    /* ============================================================
       אם נוצר ע״י מפיק – לא מבצעים login
    ============================================================ */
    if (createdByProducer) {
      return NextResponse.json({
        success: true,
        userId: user._id,
      });
    }

    /* ============================================================
       הרשמה רגילה – JWT
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
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}
