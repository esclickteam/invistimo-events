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
       🔐 חישוב גישה לדשבורד
    ====================================================== */

    const hasDashboardAccess =
      user.hasDashboardAccess === true; 
      // אם תרצי לפי תשלום:
      // user.hasPaid === true

    /* ======================================================
       🔐 JWT – מקור אמת
    ====================================================== */
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        staffType: user.staffType || null,
        hasDashboardAccess, // ⭐ חשוב!
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
          hasDashboardAccess, // ⭐ גם ללקוח
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );

    const cookieDomain =
      process.env.NODE_ENV === "production"
        ? ".invistimo.com"
        : undefined;

    const cleanup = {
      path: "/",
      maxAge: 0,
      domain: cookieDomain,
    };

    res.cookies.set("authToken", "", { ...cleanup, httpOnly: true });

    const baseCookie = {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      domain: cookieDomain,
      maxAge: 60 * 60,
    };

    /* ======================================================
       🔐 Auth Token
    ====================================================== */
    res.cookies.set("authToken", token, {
      ...baseCookie,
      httpOnly: true,
    });

    /* ======================================================
       👤 Role
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
