import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await connectDB();

    // ✅ תוספות: includeCalls + includeCreditGifts
    const {
      name,
      email,
      password,
      plan,
      guests,
      includeCalls,
      includeCreditGifts,
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
       הגדרות חבילה בסיסיות
       ❗ לא נוגעים במחירים
    ============================================================ */
    let planLimits = {
      maxGuests: 100,
      smsEnabled: true,
      seatingEnabled: false,
      remindersEnabled: true,
    };

    let paidAmount = 49;
    let guestsLevel = 100;

    if (plan === "premium") {
      const allowed = [100, 200, 300, 400, 500, 600, 700, 800, 1000];
      const safeGuests = allowed.includes(Number(guests))
        ? Number(guests)
        : 100;

      guestsLevel = safeGuests;

      planLimits = {
        maxGuests: safeGuests,
        smsEnabled: true,
        seatingEnabled: true,
        remindersEnabled: true,
      };

      const priceMap: Record<number, number> = {
        100: 149,
        200: 239,
        300: 299,
        400: 379,
        500: 429,
        600: 489,
        700: 539,
        800: 599,
        1000: 699,
      };

      paidAmount = priceMap[safeGuests] ?? 149;
    }

    /* ============================================================
       תוספות (ללא חיוב כאן!)
       החיוב האמיתי נקבע רק ב־Stripe webhook
    ============================================================ */
    const includeCallsBool = Boolean(includeCalls);

// 🎁 אם יש אישורי הגעה טלפוניים – מתנות באשראי תמיד כלולות
const includeCreditGiftsBool = includeCallsBool
  ? true
  : Boolean(includeCreditGifts);

    /* ============================================================
       יצירת המשתמש
    ============================================================ */
    const user = await User.create({
      name,
      email,
      password: hashed,
      plan: plan || "basic",
      guests: guestsLevel,
      paidAmount,
      planLimits,

      // ✅ שיחות
      includeCalls: includeCallsBool,
      callsAddonPrice: 0,

      // ✅ מתנות באשראי
      includeCreditGifts: includeCreditGiftsBool,
      creditGiftsAddonPrice: 0,
    });

    /* ============================================================
       JWT + Cookie
    ============================================================ */
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const res = NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
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
