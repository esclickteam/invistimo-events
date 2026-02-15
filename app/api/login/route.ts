import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

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

    // ערכים עסקיים חשובים
    const hasPaid = Boolean(user.hasPaid);
    const isTrial = Boolean(user.isTrial);

    /* ======================================================
       🔐 JWT – מקור אמת (כולל hasPaid)
    ====================================================== */
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        hasPaid, // ✅ קריטי ל-middleware
        isTrial, // אופציונלי אבל שימושי
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
          hasPaid, // ✅ חשוב גם לקליינט
          isTrial,
          trialExpiresAt: user.trialExpiresAt ?? null,
          smsUsed: user.smsUsed ?? 0,
          smsLimit: user.planLimits?.smsLimit ?? 0,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );

    /* ======================================================
       🍪 Cookie Domain – אחיד
    ====================================================== */
    const cookieDomain =
      process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;

    /* ======================================================
       🔥 ניקוי cookies ישנים (קריטי)
    ====================================================== */
    const cleanup = {
      path: "/",
      maxAge: 0,
      domain: cookieDomain,
    };

    res.cookies.set("authToken", "", { ...cleanup, httpOnly: true });
    res.cookies.set("producerAuthToken", "", { ...cleanup, httpOnly: true });
    res.cookies.set("adminAuthToken", "", { ...cleanup, httpOnly: true });

    res.cookies.set("role", "", { ...cleanup, httpOnly: false });
    res.cookies.set("isTrial", "", { ...cleanup, httpOnly: false });
    res.cookies.set("hasPaid", "", { ...cleanup, httpOnly: false });
    res.cookies.set("trialExpiresAt", "", { ...cleanup, httpOnly: false });
    res.cookies.set("smsUsed", "", { ...cleanup, httpOnly: false });
    res.cookies.set("smsLimit", "", { ...cleanup, httpOnly: false });

    /* ======================================================
       🍪 Cookie בסיס
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
    res.cookies.set("role", String(user.role || "user"), {
      ...baseCookie,
      httpOnly: false,
    });

    /* ======================================================
       💳 Paid status (client-readable, UX בלבד)
       האבטחה עצמה נשענת על JWT+middleware
    ====================================================== */
    res.cookies.set("hasPaid", String(hasPaid), {
      ...baseCookie,
      httpOnly: false,
    });

    /* ======================================================
       🧪 Trial
    ====================================================== */
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
