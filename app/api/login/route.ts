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
    if (!user) {
      return NextResponse.json(
        { error: "מייל או סיסמה שגויים" },
        { status: 401 }
      );
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return NextResponse.json(
        { error: "מייל או סיסמה שגויים" },
        { status: 401 }
      );
    }

    /* ======================================================
       יצירת JWT
    ====================================================== */
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        isTrial: user.isTrial,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    const res = NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isTrial: user.isTrial,
      },
    });

    /* ======================================================
       הגדרה בסיסית לכל ה־cookies
    ====================================================== */
    const baseCookie = {
      domain: "www.invistimo.com", // ✅ קריטי
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60,
    };

    /* ======================================================
       מחיקה מקדימה ליתר ביטחון
    ====================================================== */
    res.cookies.delete("authToken");
    res.cookies.delete("isTrial");
    res.cookies.delete("trialExpiresAt");
    res.cookies.delete("smsUsed");
    res.cookies.delete("smsLimit");

    /* ======================================================
       Auth Token
    ====================================================== */
    res.cookies.set("authToken", token, baseCookie);

    /* ======================================================
       Trial
    ====================================================== */
    res.cookies.set("isTrial", String(user.isTrial), {
      ...baseCookie,
      httpOnly: false,
    });

    if (user.isTrial && user.trialExpiresAt) {
      res.cookies.set(
        "trialExpiresAt",
        String(user.trialExpiresAt.getTime()),
        {
          ...baseCookie,
          httpOnly: false,
        }
      );
    }

    res.cookies.set("smsUsed", String(user.smsUsed ?? 0), {
      ...baseCookie,
      httpOnly: false,
    });

    res.cookies.set(
      "smsLimit",
      String(user.planLimits?.smsLimit ?? 0),
      {
        ...baseCookie,
        httpOnly: false,
      }
    );

    return res;
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}
