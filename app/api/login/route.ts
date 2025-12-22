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
       JWT
    ====================================================== */
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
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
       ניקוי Cookies ישנים (חשוב למובייל)
    ====================================================== */
    res.cookies.delete("authToken");
    res.cookies.delete("isTrial");
    res.cookies.delete("trialExpiresAt");
    res.cookies.delete("smsUsed");
    res.cookies.delete("smsLimit");

    /* ======================================================
       Auth Token (משותף לכל הדומיינים)
    ====================================================== */
    res.cookies.set("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      domain: ".invistimo.com",
      maxAge: 60 * 60, // 1 שעה
    });

    /* ======================================================
       Cookies ל-Trial / Middleware
       (🔥 קריטי)
    ====================================================== */
    res.cookies.set("isTrial", String(user.isTrial), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      domain: ".invistimo.com",
      maxAge: 60 * 60,
    });

    if (user.isTrial && user.trialExpiresAt) {
      res.cookies.set(
        "trialExpiresAt",
        String(user.trialExpiresAt.getTime()),
        {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          domain: ".invistimo.com",
          maxAge: 60 * 60,
        }
      );
    }

    res.cookies.set("smsUsed", String(user.smsUsed ?? 0), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      domain: ".invistimo.com",
      maxAge: 60 * 60,
    });

    res.cookies.set(
      "smsLimit",
      String(user.planLimits?.smsLimit ?? 0),
      {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        domain: ".invistimo.com",
        maxAge: 60 * 60,
      }
    );

    return res;
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}
