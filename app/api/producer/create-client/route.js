import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req) {
  try {
    await connectDB();

    console.log("🟢 create-client API hit");

    /* =========================
       COOKIE DEBUG (SAFE)
    ========================= */
    const cookieStore = cookies();

    const token = cookieStore.get("authToken")?.value;
    console.log("🔐 authToken:", token);

    // debug מתקדם – אם צריך לראות הכול
    const rawCookieHeader = headers().get("cookie");
    console.log("🍪 raw cookie header:", rawCookieHeader);

    if (!token) {
      console.log("⛔ No authToken found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* =========================
       JWT VERIFY
    ========================= */
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("🧠 decoded token:", decoded);
    } catch (err) {
      console.log("⛔ JWT verification failed:", err);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const producerId = decoded?.id || decoded?._id;
    console.log("👤 producerId:", producerId);

    if (!producerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const producer = await User.findById(producerId);
    console.log("👤 producer user:", producer);

    if (!producer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (producer.role !== "producer") {
      console.log("⛔ Not producer role:", producer.role);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* =========================
       BODY
    ========================= */
    const body = await req.json();
    console.log("📦 request body:", body);

    const { email, name, phone, guests, includeCalls } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* =========================
       EXISTING USER
    ========================= */
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ success: true, user: existingUser });
    }

    /* =========================
       CREATE CLIENT
    ========================= */
    const tempPassword = Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const maxGuests = Number(guests) || 100;

    const newUser = await User.create({
      name,
      email,
      phone: phone || "",

      password: hashedPassword,
      needsPasswordSetup: true,

      role: "client",
      createdByProducer: producerId,

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
      includeCreditGifts: false,

      isDemoUser: false,
    });

    console.log("✅ Client created:", newUser._id);

    return NextResponse.json({
      success: true,
      user: newUser,
    });
  } catch (err) {
    console.error("❌ create-client fatal error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
