import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await connectDB();

    // ✅ הוספנו includeCalls (בלי לגעת במחירים בכלל)
    const { name, email, password, plan, guests, includeCalls } =
      await req.json();

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
       הגדרות חבילה לפי סוג
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
        200: 199,
        300: 249,
        400: 299,
        500: 349,
        600: 399,
        700: 449,
        800: 499,
        1000: 699,
      };

      paidAmount = priceMap[safeGuests] ?? 149;
    }

    /* ============================================================
       ✅ שיחות טלפוניות (3 סבבים)
       ⚠️ לא מחייבים כאן כסף! (התשלום נקבע ע"י Stripe + webhook)
       כאן רק שומרים בחירה ראשונית כדי שלא "יאבד" בדרך
    ============================================================ */
    const includeCallsBool = Boolean(includeCalls);

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

      // ✅ חדש
      includeCalls: includeCallsBool,
      callsAddonPrice: 0, // ישתנה ב-webhook לפי Stripe (totalPaid / callsAddonPrice)
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
      secure: true, // חובה ל-SameSite=None
      sameSite: "none", // ⭐️ קריטי ל-Stripe redirect
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
