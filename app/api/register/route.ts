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

    const body = await req.json();

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase(); // ✅ normalize
    const password = String(body?.password || "");
    const createdByProducer = Boolean(body?.createdByProducer);

    /* ============================================================
       Validation
    ============================================================ */
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "נא למלא את כל השדות" },
        { status: 400 }
      );
    }

    // אפשר להקשיח ולדרוש אימייל תקין:
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return NextResponse.json(
        { success: false, error: "אימייל לא תקין" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "הסיסמה חייבת להכיל לפחות 6 תווים" },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json(
        { success: false, error: "המייל כבר קיים במערכת" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    /* ============================================================
       Create user – payment state starts as unpaid
       Stripe webhook will activate paid state
    ============================================================ */
    const user = await User.create({
      name,
      email,
      password: hashedPassword,

      role: "user",
      plan: "basic",

      hasPaid: false,
      paidAmount: 0,

      isActive: false,
      hasDashboardAccess: false, // ✅ מומלץ להוסיף אם קיים בסכמה

      isTrial: true,

      guests: 0,
      maxMessages: 0,
      remainingMessages: 0,
      smsBalance: 0,
      smsUsed: 0,
      whatsappBalance: 0,
      whatsappUsed: 0,

      includeCalls: false,
      callsAddonPrice: 0,
      includeCreditGifts: false,
      creditGiftsAddonPrice: 0,

      createdByProducer,
      needsPasswordSetup: !createdByProducer,
      billingSource: createdByProducer ? "producer" : "site",
    });

    const userId = String(user._id); // ✅ חשוב להחזיר string

    /* ============================================================
       If created by producer – NO LOGIN
    ============================================================ */
    if (createdByProducer) {
      return NextResponse.json({
        success: true,
        userId,
      });
    }

    /* ============================================================
       Regular signup – issue JWT
       (שים לב: payload כולל role + hasPaid כדי שמידלוור יוכל להחליט)
    ============================================================ */
    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { success: false, error: "JWT secret is missing" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        userId,
        role: "user",
        hasPaid: false,
        email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const res = NextResponse.json({
      success: true,
      userId,
    });

    // ✅ cookie policy פר-סביבה
    const isProd = process.env.NODE_ENV === "production";
    const cookieDomain = isProd ? ".invistimo.com" : undefined;

    res.cookies.set("authToken", token, {
      httpOnly: true,
      secure: isProd,                 // ✅ בלוקאל לא
      sameSite: "lax",                // ✅ יציב לרוב הזרימות
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    // אופציונלי: קוקי role לקריאת קליינט
    res.cookies.set("role", "user", {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json(
      { success: false, error: "שגיאה בשרת" },
      { status: 500 }
    );
  }
}
