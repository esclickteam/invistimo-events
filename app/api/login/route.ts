import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "חסרים פרטי התחברות" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email }).select("+password");
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
       🔐 JWT – מקור האמת
    ====================================================== */
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
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
        role: user.role,
        isTrial: user.isTrial,
      },
    });

    /* ======================================================
       🔥 ניקוי cookies קודמים (מונע הדבקה)
    ====================================================== */
    res.cookies.delete("authToken");
    res.cookies.delete("role");
    res.cookies.delete("isTrial");
    res.cookies.delete("trialExpiresAt");
    res.cookies.delete("smsUsed");
    res.cookies.delete("smsLimit");

    /* ======================================================
       🍪 Cookie בסיס
       ❗ בלי domain – תואם middleware + logout
    ====================================================== */
    const baseCookie = {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60, // 1 שעה
    };

    /* ======================================================
       🔐 Auth Token (HttpOnly)
    ====================================================== */
    res.cookies.set("authToken", token, {
      ...baseCookie,
      httpOnly: true,
    });

    /* ======================================================
       👤 Role (לא HttpOnly – למידלוור)
    ====================================================== */
    res.cookies.set("role", user.role, {
      ...baseCookie,
      httpOnly: false,
    });

    /* ======================================================
       🧪 Trial
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

    /* ======================================================
       ✉️ SMS limits
    ====================================================== */
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
    return NextResponse.json(
      { error: "שגיאה בשרת" },
      { status: 500 }
    );
  }
}
