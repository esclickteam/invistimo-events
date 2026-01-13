import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Payment from "@/models/Payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   INIT
========================================================= */
const resend = new Resend(process.env.RESEND_API_KEY!);
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.invistimo.com";

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
     Cookies & Auth
  ========================= */
  const cookieHeader = req.headers.get("cookie") || "";

const token =
  cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith("authToken="))
    ?.split("=")[1] || null;

console.log("🔐 token exists:", !!token);
console.log("🍪 raw cookie header exists:", !!cookieHeader);

  await connectDB();

  if (!token) {
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
  const producer = await User.findById(producerId).lean();
  if (!producer || producer.role !== "producer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* =========================
     Body
  ========================= */
  let body: CreateClientBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, name, phone, guests, includeCalls } = body;
  if (!email || !name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const maxGuests = Number(guests) || 100;
  const priceKey = getPriceKeyByGuests(maxGuests);
  const amount = getAmountByGuests(maxGuests);

  console.log("📦 Pricing:", { maxGuests, priceKey, amount });

  /* =========================
     Check existing
  ========================= */
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log("⚠️ User already exists:", existingUser._id);
    return NextResponse.json({ success: true, user: existingUser });
  }

  /* =========================
     Create new user
  ========================= */
  try {
    const magicToken = crypto.randomBytes(32).toString("hex");
    const magicTokenExpires = Date.now() + 1000 * 60 * 60 * 24; // 24h

    const newUser = await User.create({
      name,
      email,
      phone: phone || "",
      needsPasswordSetup: true,
      magicToken,
      magicTokenExpires,

      role: "client",
      createdByProducer: producerId,

      hasPaid: true,
      isTrial: false,
      plan: "premium",
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

    /* =========================
       Payment record
    ========================= */
    const payment = await Payment.create({
      email: newUser.email,
      priceKey,
      maxGuests,
      includeCalls: !!includeCalls,
      includeCreditGifts: false,
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
      },
    });

    console.log("💳 Payment created:", payment._id);

    /* =========================
       Send Magic Link email
    ========================= */
    const magicLink = `${BASE_URL}/set-password?token=${magicToken}`;
    try {
      await resend.emails.send({
        from: "Invistimo <noreply@invistimo.com>",
        to: email,
        subject: "הגדרת סיסמה לחשבון שלך",
        html: `
          <div style="font-family:Heebo,Arial,sans-serif;direction:rtl;text-align:right">
            <h2>ברוך הבא לאינויסטימו 🎉</h2>
            <p>המפיק שלך יצר עבורך חשבון חדש במערכת.</p>
            <p>להגדרת סיסמה ולכניסה למערכת לחץ כאן:</p>
            <a href="${magicLink}" target="_blank"
              style="display:inline-block;margin-top:12px;padding:10px 20px;background:#6c3aff;color:white;text-decoration:none;border-radius:6px">
              הגדר סיסמה
            </a>
            <p style="margin-top:16px;font-size:14px;color:#555">
              הקישור תקף ל-24 שעות בלבד.
            </p>
          </div>
        `,
      });
      console.log("📧 Magic link email sent to:", email);
    } catch (err) {
      console.error("❌ Failed to send magic link:", err);
    }

    return NextResponse.json({ success: true, user: newUser, payment });
  } catch (err) {
    console.error("❌ create-client save error:", err);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
