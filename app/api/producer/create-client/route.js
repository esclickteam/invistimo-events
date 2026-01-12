import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req) {
  try {
    await connectDB();

    /* =========================
       AUTH – מזהה מפיק מה-token
    ========================= */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const producerId = decoded?.id || decoded?._id;
    if (!producerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* =========================
       קבלת נתוני גוף הבקשה
    ========================= */
    const { email, name, phone } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    /* =========================
       אם המשתמש כבר קיים
    ========================= */
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ success: true, user: existingUser });
    }

    /* =========================
       יצירת משתמש חדש ע״י מפיק
    ========================= */
    const newUser = await User.create({
      name: name || "",
      email,
      password: "temporary", // בהמשך תשלחי לו לינק התחברות
      phone: phone || "",
      role: "user",
      createdByProducer: producerId, // ✅ שומר מי פתח
      plan: "premium",
      isTrial: false,
      guests: 100,
      paidAmount: 0, // כי המפיק שילם עליו
      includeCalls: false,
      includeCreditGifts: false,
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (err) {
    console.error("❌ Error in create-client:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
