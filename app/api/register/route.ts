import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await connectDB();

    // ✅ includeCalls מגיע מהקליינט (calls=1)
    const { name, email, password, plan, guests, includeCalls } = await req.json();

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
       helpers
    ============================================================ */
    const allowed = [100, 200, 300, 400, 500, 600, 700, 800, 1000];

    const safeGuests =
      plan === "premium" && allowed.includes(Number(guests))
        ? Number(guests)
        : 100;

    const callsSelected = plan === "premium" ? Boolean(includeCalls) : false;

    // ✅ תוספת שירות שיחות: 1₪ לכל אורח (רק אם סומן)
    const callsAddonPrice = callsSelected ? safeGuests * 1 : 0;

    /* ============================================================
       הגדרות חבילה לפי סוג
    ============================================================ */
    let planLimits = {
      maxGuests: 100,
      smsEnabled: true,
      smsLimit: 100, // ✅ תואם למודל שלך
      seatingEnabled: false,
      remindersEnabled: true,
    };

    let paidAmount = 49;
    let guestsLevel = 100;

    if (plan === "premium") {
      guestsLevel = safeGuests;

      planLimits = {
        maxGuests: safeGuests,
        smsEnabled: true,
        smsLimit: Number.POSITIVE_INFINITY as any, // ✅ כמו במודל שלך (Infinity)
        seatingEnabled: true,
        remindersEnabled: true,
      };

      // ✅ המפה החדשה שלך לפרימיום (כמו שביקשת)
      const priceMap: Record<number, number> = {
        100: 99,
        200: 149,
        300: 199,
        400: 249,
        500: 299,
        600: 349,
        700: 399,
        800: 449,
        1000: 499,
      };

      const basePrice = priceMap[safeGuests] ?? 99;

      // ✅ מחיר כולל = מחיר חבילה + תוספת שיחות (אם נבחר)
      paidAmount = basePrice + callsAddonPrice;
    }

    /* ============================================================
       יצירת המשתמש
       ✅ שומר גם includeCalls + callsAddonPrice במונגו
    ============================================================ */
    const user = await User.create({
      name,
      email,
      password: hashed,
      plan: plan || "basic",
      guests: guestsLevel,
      paidAmount,
      planLimits,

      // ✅ חדש
      includeCalls: callsSelected,
      callsAddonPrice,
    });

    /* ============================================================
       יצירת JWT + Cookie (כמו login)
    ============================================================ */
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const res = NextResponse.json({
      success: true,
      user: { _id: user._id, name: user.name, email: user.email },
    });

    res.cookies.set("authToken", token, {
      httpOnly: true,
      secure: true,             // חובה ל-SameSite=None
      sameSite: "none",         // ⭐️ קריטי ל-Stripe redirect
      domain: ".invistimo.com", // www + בלי www
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}
