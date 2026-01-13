import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

/* =========================================================
   CREATE CLIENT BY PRODUCER
========================================================= */
export async function POST(req) {
  console.log("🟢 create-client API hit");

  /* =========================================================
     1. Grab cookies and headers BEFORE any await
  ========================================================== */
  const cookieStore = cookies();
  const token = cookieStore.get("authToken")?.value || null;
  const rawCookieHeader = headers().get("cookie");

  console.log("🔐 token (from cookies):", token);
  console.log("🍪 raw cookie header:", rawCookieHeader);
  console.log("🧩 cookieStore.get type:", typeof cookieStore.get);

  /* =========================================================
     2. Connect to DB (safe after cookies read)
  ========================================================== */
  try {
    await connectDB();
  } catch (err) {
    console.error("❌ DB connection error:", err);
    return NextResponse.json({ error: "DB connection failed" }, { status: 500 });
  }

  /* =========================================================
     3. Auth token validation
  ========================================================== */
  if (!token) {
    console.log("⛔ No authToken found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🧠 decoded token:", decoded);
  } catch (err) {
    console.error("⛔ JWT verification failed:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const producerId = decoded?.id || decoded?._id;
  console.log("👤 producerId:", producerId);

  if (!producerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* =========================================================
     4. Verify producer user
  ========================================================== */
  const producer = await User.findById(producerId).lean();
  console.log("👤 producer user:", producer);

  if (!producer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (producer.role !== "producer") {
    console.log("⛔ Not producer role:", producer.role);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* =========================================================
     5. Parse body
  ========================================================== */
  let body;
  try {
    body = await req.json();
  } catch (err) {
    console.error("❌ Failed to parse JSON body:", err);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  console.log("📦 request body:", body);
  const { email, name, phone, guests, includeCalls } = body;

  if (!email || !name) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  /* =========================================================
     6. Check for existing user
  ========================================================== */
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log("⚠️ User already exists:", existingUser._id);
    return NextResponse.json({ success: true, user: existingUser });
  }

  /* =========================================================
     7. Create client user
  ========================================================== */
  try {
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
    console.error("❌ create-client save error:", err);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
