import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   TYPES
========================================================= */
type AuthTokenPayload = JwtPayload & {
  userId?: string; // ✅ זה מה שאת עושה ב-register/login
  id?: string;
  _id?: string;
  email?: string;
  role?: string;
};

/* =========================================================
   CREATE CLIENT BY PRODUCER — FIXED FOR TS
========================================================= */
export async function POST(req: Request): Promise<NextResponse> {
  console.log("🟢 create-client API hit");

  /* =========================================================
     1. Grab cookies and headers BEFORE any await connectDB()
  ========================================================== */
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value || null;

  const allHeaders = await headers();
  const rawCookieHeader = allHeaders.get("cookie");

  console.log("🔐 token (from cookies) exists:", !!token);
  console.log("🍪 raw cookie header exists:", !!rawCookieHeader);
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

  let decoded: AuthTokenPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthTokenPayload;
    console.log("🧠 decoded token:", decoded);
    console.log("🧠 decoded keys:", Object.keys(decoded || {}));
  } catch (err) {
    console.error("⛔ JWT verification failed:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // ✅ חשוב: אצלך ב-register/login זה userId
  const producerId = decoded.userId || decoded.id || decoded._id;

  console.log("👤 producerId:", producerId);

  if (!producerId) {
    console.log("⛔ producerId missing in token payload");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* =========================================================
     4. Verify producer user
  ========================================================== */
  const producer = await User.findById(producerId).lean();
  console.log("👤 producer user exists:", !!producer);

  if (!producer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("👤 producer.role:", producer.role);

  if (producer.role !== "producer") {
    console.log("⛔ Not producer role:", producer.role);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* =========================================================
     5. Parse body
  ========================================================== */
  let body: {
    email: string;
    name: string;
    phone?: string;
    guests?: number;
    includeCalls?: boolean;
  };

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
      createdByProducer: producerId, // ✅ ObjectId של המפיק

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
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
