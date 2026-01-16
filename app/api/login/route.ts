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
      return NextResponse.json({ error: "חסרים פרטי התחברות" }, { status: 400 });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return NextResponse.json({ error: "מייל או סיסמה שגויים" }, { status: 401 });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return NextResponse.json({ error: "מייל או סיסמה שגויים" }, { status: 401 });
    }

    /* ======================================================
       🔐 JWT – מקור אמת
    ====================================================== */
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    const res = NextResponse.json(
      {
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isTrial: user.isTrial,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );

    /* ======================================================
       🍪 Cookie Domain – אחיד כדי שלא יהיה "פעם נמחק פעם לא"
       (הסיבה: www מול בלי www / סאב-דומיינים)
    ====================================================== */
    const cookieDomain =
      process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;

    /* ======================================================
       🔥 ניקוי cookies ישנים (קריטי!)
       חשוב: לנקות עם אותו domain/path
    ====================================================== */
    const cleanup = {
      path: "/",
      maxAge: 0,
      domain: cookieDomain,
    };

    res.cookies.set("authToken", "", { ...cleanup, httpOnly: true });
    res.cookies.set("role", "", { ...cleanup, httpOnly: false });
    res.cookies.set("isTrial", "", { ...cleanup, httpOnly: false });
    res.cookies.set("trialExpiresAt", "", { ...cleanup, httpOnly: false });
    res.cookies.set("smsUsed", "", { ...cleanup, httpOnly: false });
    res.cookies.set("smsLimit", "", { ...cleanup, httpOnly: false });

    /* ======================================================
       🍪 Cookie בסיס – תואם לכל המערכת
    ====================================================== */
    const baseCookie = {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      domain: cookieDomain,
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
       👤 Role (client-readable)
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
      res.cookies.set("trialExpiresAt", String(user.trialExpiresAt.getTime()), {
        ...baseCookie,
        httpOnly: false,
      });
    } else {
      // אם אין טרייל/תאריך – לוודא שאין קוקייה ישנה
      res.cookies.set("trialExpiresAt", "", {
        ...cleanup,
        httpOnly: false,
      });
    }

    /* ======================================================
       ✉️ SMS limits
    ====================================================== */
    res.cookies.set("smsUsed", String(user.smsUsed ?? 0), {
      ...baseCookie,
      httpOnly: false,
    });

    res.cookies.set("smsLimit", String(user.planLimits?.smsLimit ?? 0), {
      ...baseCookie,
      httpOnly: false,
    });

    return res;
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}
