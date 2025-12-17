import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import { connectDB } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { name, email, password, plan, guests } = await req.json();

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

      // לדוגמה — תמחור בסיסי לפי גודל
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
       יצירת המשתמש במסד הנתונים (תואם למודל)
    ============================================================ */
    const user = await User.create({
      name,
      email,
      password: hashed,
      plan: plan || "basic",
      guests: guestsLevel,
      paidAmount,
      planLimits,
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}
