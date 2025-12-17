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
    let maxGuests = 100;
    let seatingEnabled = false;

    if (plan === "premium") {
      seatingEnabled = true;

      // ✅ הגדרה לפי הכמות שהועברה
      const allowedGuestCounts = [
        100, 200, 300, 400, 500, 600, 700, 800, 1000,
      ];

      if (allowedGuestCounts.includes(Number(guests))) {
        maxGuests = Number(guests);
      } else {
        maxGuests = 100; // ברירת מחדל
      }
    }

    /* ============================================================
       יצירת המשתמש במסד הנתונים
    ============================================================ */
    const user = await User.create({
      name,
      email,
      password: hashed,
      plan: plan || "basic",
      maxGuests,
      seatingEnabled,
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json({ error: "שגיאה בשרת" }, { status: 500 });
  }
}
