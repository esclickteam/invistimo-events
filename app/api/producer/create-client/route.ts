import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Payment from "@/models/Payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   TYPES
========================================================= */
type AuthTokenPayload = JwtPayload & {
  userId?: string;
  id?: string;
  _id?: string;
  email?: string;
  role?: string;
};

type CreateClientBody = {
  email: string;
  name: string;
  phone?: string;
  guests?: number;
  includeCalls?: boolean;
};

/* =========================================================
   HELPERS
========================================================= */
function getPriceKeyByGuests(maxGuests: number) {
  const map: Record<number, string> = {
    100: "premium_100_v2",
    200: "premium_200_v2",
    300: "premium_300",
    400: "premium_400",
    500: "premium_500",
    600: "premium_600",
    700: "premium_700",
    800: "premium_800",
    1000: "premium_1000",
  };

  return map[maxGuests] || "premium_100_v2";
}

function getAmountByGuests(maxGuests: number) {
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

  return priceMap[maxGuests] ?? 149;
}

/* =========================================================
   CREATE CLIENT BY PRODUCER
========================================================= */
export async function POST(req: Request): Promise<NextResponse> {
  console.log("🟢 create-client API hit");

  /* =========================
     Cookies/Headers (before connectDB await)
  ========================= */
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value || null;

  const allHeaders = await headers();
  const rawCookieHeader = allHeaders.get("cookie");

  console.log("🔐 token exists:", !!token);
  console.log("🍪 raw cookie header exists:", !!rawCookieHeader);

  /* =========================
     DB
  ========================= */
  try {
    await connectDB();
  } catch (err) {
    console.error("❌ DB connection error:", err);
    return NextResponse.json({ error: "DB connection failed" }, { status: 500 });
  }

  /* =========================
     Auth
  ========================= */
  if (!token) {
    console.log("⛔ No authToken found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let decoded: AuthTokenPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthTokenPayload;
  } catch (err) {
    console.error("⛔ JWT verification failed:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const producerId = decoded.userId || decoded.id || decoded._id;
  console.log("👤 producerId:", producerId);

  if (!producerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const producer = await User.findById(producerId).lean();
  if (!producer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (producer.role !== "producer") {
    console.log("⛔ Not producer role:", producer.role);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* =========================
     Body
  ========================= */
  let body: CreateClientBody;
  try {
    body = await req.json();
  } catch (err) {
    console.error("❌ Invalid JSON body:", err);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, name, phone, guests, includeCalls } = body;

  if (!email || !name) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const maxGuests = Number(guests) || 100;

  // ✅ מחיר וקוד מוצר לפי אורחים
  const priceKey = getPriceKeyByGuests(maxGuests);
  const amount = getAmountByGuests(maxGuests);

  console.log("📦 create-client pricing:", { maxGuests, priceKey, amount });

  /* =========================
     Existing user
  ========================= */
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log("⚠️ User already exists:", existingUser._id);
    return NextResponse.json({ success: true, user: existingUser });
  }

  /* =========================
     Create user
     (אל תשלחי maxMessages וכו' כדי שהסכמה תחושב)
  ========================= */
  try {
    const tempPassword = Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

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

      // ✅ עכשיו גם ביוזר נשמר מחיר אמיתי
      paidAmount: amount,

      guests: maxGuests,

      planLimits: {
        maxGuests,
        smsEnabled: true,
        smsLimit: 0,
        seatingEnabled: true,
        remindersEnabled: true,
      },

      includeCalls: !!includeCalls,
      includeCreditGifts: false,

      isDemoUser: false,
    });

    console.log("✅ Client created:", newUser._id);
    console.log("💬 maxMessages:", newUser.maxMessages);
    console.log("💬 remainingMessages:", newUser.remainingMessages);

    /* =========================
       Create payment record
       חובה: priceKey + amount
    ========================= */
    const payment = await Payment.create({
      email: newUser.email,

      // Stripe optional -> לא שמים כלום
      priceKey,
      maxGuests,

      includeCalls: !!includeCalls,
      callsAddonPrice: 0,

      includeCreditGifts: false,
      creditGiftsAddonPrice: 0,

      // ✅ עכשיו גם בתשלום נשמר מחיר אמיתי
      amount,
      refundAmount: 0,
      currency: "ils",

      type: "package",
      status: "paid",

      isTest: false,

      metadata: {
        source: "producer-create-client",
        producerId: String(producerId),
        userId: String(newUser._id),
        note: "Manual/internal payment created by producer flow",
      },
    });

    console.log("💳 Payment created:", payment._id);

    return NextResponse.json({
      success: true,
      user: newUser,
      payment,
    });
  } catch (err) {
    console.error("❌ create-client save error:", err);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
