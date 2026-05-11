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

    if (!process.env.JWT_SECRET) {
      console.error("❌ Missing JWT_SECRET");
      return NextResponse.json(
        { success: false, error: "שגיאת הגדרות שרת" },
        {
          status: 500,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const body = await req.json();

    const email = String(body?.email || "")
      .trim()
      .toLowerCase();

    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "חסרים פרטי התחברות" },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return NextResponse.json(
        { success: false, error: "מייל או סיסמה שגויים" },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return NextResponse.json(
        { success: false, error: "מייל או סיסמה שגויים" },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    /* ======================================================
       Business flags
    ====================================================== */

    const hasPaid = Boolean(user.hasPaid);
    const isTrial = Boolean(user.isTrial);

    const role = String(user.role || "user");

    /* ======================================================
       JWT - 7 days
    ====================================================== */

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role,
        hasPaid,
        isTrial,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    const res = NextResponse.json(
      {
        success: true,
        user: {
          _id: String(user._id),
          name: user.name ?? "",
          email: user.email ?? "",
          role,
          hasPaid,
          isTrial,
          trialExpiresAt: user.trialExpiresAt ?? null,
          smsUsed: user.smsUsed ?? 0,
          smsLimit: user.planLimits?.smsLimit ?? 0,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );

    /* ======================================================
       Cookie domain
    ====================================================== */

    const cookieDomain =
      process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;

    /* ======================================================
       Cookie options
    ====================================================== */

    const baseCookie = {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      maxAge: 60 * 60 * 24 * 7, // 7 ימים
    };

    const cleanupCookie = {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      maxAge: 0,
    };

    const cleanupCookieWithoutDomain = {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 0,
    };

    /* ======================================================
       Clean old cookies - with domain and without domain
    ====================================================== */

    const cookiesToClear = [
      "authToken",
      "producerAuthToken",
      "adminAuthToken",

      // legacy / old names
      "token",
      "adminToken",
      "impersonationToken",

      // client-readable UX cookies
      "role",
      "isTrial",
      "hasPaid",
      "trialExpiresAt",
      "smsUsed",
      "smsLimit",
    ];

    for (const name of cookiesToClear) {
      const isHttpOnly =
        name === "authToken" ||
        name === "producerAuthToken" ||
        name === "adminAuthToken" ||
        name === "token" ||
        name === "adminToken" ||
        name === "impersonationToken";

      // מחיקה עם domain
      res.cookies.set(name, "", {
        ...cleanupCookie,
        httpOnly: isHttpOnly,
      });

      // מחיקה גם בלי domain
      res.cookies.set(name, "", {
        ...cleanupCookieWithoutDomain,
        httpOnly: isHttpOnly,
      });
    }

    /* ======================================================
       Auth token - HttpOnly
    ====================================================== */

    res.cookies.set("authToken", token, {
      ...baseCookie,
      httpOnly: true,
    });

    /* ======================================================
       Client-readable cookies - UX only
       האבטחה עצמה נשענת על JWT + Middleware + API
    ====================================================== */

    res.cookies.set("role", role, {
      ...baseCookie,
      httpOnly: false,
    });

    res.cookies.set("hasPaid", String(hasPaid), {
      ...baseCookie,
      httpOnly: false,
    });

    res.cookies.set("isTrial", String(isTrial), {
      ...baseCookie,
      httpOnly: false,
    });

    if (isTrial && user.trialExpiresAt) {
      res.cookies.set("trialExpiresAt", String(user.trialExpiresAt.getTime()), {
        ...baseCookie,
        httpOnly: false,
      });
    } else {
      res.cookies.set("trialExpiresAt", "", {
        ...cleanupCookie,
        httpOnly: false,
      });

      res.cookies.set("trialExpiresAt", "", {
        ...cleanupCookieWithoutDomain,
        httpOnly: false,
      });
    }

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

    return NextResponse.json(
      {
        success: false,
        error: "שגיאה בשרת",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}