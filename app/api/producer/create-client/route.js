import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req) {
  try {
    await connectDB();

    /* =========================
       AUTH – זיהוי מפיק
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

    const producer = await User.findById(producerId);
    if (!producer || producer.role !== "producer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* =========================
       BODY
    ========================= */
    const { email, name, phone, guests, includeCalls } = await req.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* =========================
       בדיקה אם קיים
    ========================= */
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ success: true, user: existingUser });
    }

    /* =========================
       סיסמה זמנית
    ========================= */
    const tempPassword = Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const maxGuests = Number(guests) || 100;

    /* =========================
       CREATE CLIENT – זהה ללקוח משלם
    ========================= */
    const newUser = await User.create({
      name,
      email,
      phone: phone || "",

      password: hashedPassword,
      needsPasswordSetup: true,

      role: "client",
      createdByProducer: producerId,

      /* ===== זהות ללקוח משלם ===== */
      hasPaid: true,
      isTrial: false,
      plan: "premium",
      paidAmount: 0,

      guests: maxGuests,

      planLimits: {
        maxGuests,
        smsEnabled: true,
        smsLimit: 0,
        seatingEnabled: true,
        remindersEnabled: true,
      },

      maxMessages: 0,
      remainingMessages: 0,
      smsUsed: 0,

      includeCalls: !!includeCalls,
      callsAddonPrice: includeCalls ? 0 : 0,

      includeCreditGifts: false,
      creditGiftsAddonPrice: 0,

      isDemoUser: false,
    });

    return NextResponse.json({
      success: true,
      user: newUser,
    });
  } catch (err) {
    console.error("❌ create-client error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
