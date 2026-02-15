import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
       🔐 חישוב גישה לדשבורד
       את יכולה לשנות את הלוגיקה לפי צורך (למשל לפי תשלום)
    ====================================================== */
    const hasDashboardAccess =
      user.hasDashboardAccess === true; 
      // לחלופין:
      // user.hasPaid === true

    /* ======================================================
       🔐 JWT – מקור אמת
       שימי לב: אין פה domain בקוקיז בהמשך
    ====================================================== */
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        staffType: user.staffType || null,
        hasDashboardAccess,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    const res = NextResponse.json(
      {
        success: true,
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          isTrial: user.isTrial,
          hasDashboardAccess,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );

    /* ======================================================
       🧹 ניקוי קוקי ישן (בלי domain!)
    ====================================================== */
    res.cookies.set("authToken", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
    });

    /* ======================================================
       🍪 בסיס קוקיז (בלי domain!)
    ====================================================== */
    const baseCookie = {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60, // שעה
    };

    /* ======================================================
       🔐 Auth Token (HttpOnly)
    ====================================================== */
    res.cookies.set("authToken", token, {
      ...baseCookie,
      httpOnly: true,
    });

    /* ======================================================
       👤 Role (נגיש ללקוח)
    ====================================================== */
    res.cookies.set("role", user.role, {
      ...baseCookie,
      httpOnly: false,
    });

    /* ======================================================
       🧪 Trial
    ====================================================== */
    res.cookies.set("isTrial", String(user.isTrial ?? false), {
      ...baseCookie,
      httpOnly: false,
    });

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
