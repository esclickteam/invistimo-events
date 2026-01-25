import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
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
const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.invistimo.com";

/* =========================================================
   TYPES
========================================================= */
type AuthTokenPayload = JwtPayload & {
  userId?: string;
  id?: string;
  _id?: string;
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
export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("🟢 create-client API hit");

  /* ================= AUTH ================= */
  const token = req.cookies.get("authToken")?.value || null;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let decoded: AuthTokenPayload;
  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as AuthTokenPayload;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const producerId = decoded.userId || decoded.id || decoded._id;

  await connectDB();

  const producer = await User.findById(producerId);
  if (!producer || producer.role !== "producer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* ================= BODY ================= */
  let body: CreateClientBody;
  try {
    body = await req.json();
  } catch {
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
  const priceKey = getPriceKeyByGuests(maxGuests);
  const amount = getAmountByGuests(maxGuests);

  /* ================= EXISTING USER ================= */
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    if (existingUser.needsPasswordSetup) {
      const resetPasswordToken = crypto.randomBytes(32).toString("hex");
      const resetPasswordExpires = new Date(
        Date.now() + 1000 * 60 * 60 * 24
      );

      existingUser.resetPasswordToken = resetPasswordToken;
      existingUser.resetPasswordExpires = resetPasswordExpires;
      await existingUser.save();

      const magicLink = `${BASE_URL}/set-password?token=${resetPasswordToken}`;

      console.log("📧 Sending magic link to existing user:", email);

      await resend.emails.send({
        from: "Invistimo <noreply@invistimo.com>",
        to: email,
        subject: "הגדרת סיסמה לחשבון שלך",
        html: `
          <div style="font-family:Heebo,Arial,sans-serif;direction:rtl;text-align:right">
            <h2>ברוך הבא לאינויסטימו 🎉</h2>
            <p>נשלח אליך שוב קישור להגדרת סיסמה:</p>
            <a href="${magicLink}"
              style="display:inline-block;margin-top:12px;padding:10px 20px;background:#6c3aff;color:white;text-decoration:none;border-radius:6px">
              הגדר סיסמה
            </a>
            <p style="margin-top:16px;font-size:14px;color:#555">
              הקישור תקף ל־24 שעות.
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true, user: existingUser });
  }

  /* ================= CREATE USER ================= */
  try {
    const resetPasswordToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordExpires = new Date(
      Date.now() + 1000 * 60 * 60 * 24
    );

    const newUser = await User.create({
      name,
      email,
      phone: phone || "",

      role: "client",
      producerId: producer._id,
      createdByProducer: producer._id,
      needsPasswordSetup: true,
      resetPasswordToken,
      resetPasswordExpires,

      hasPaid: true,
      isTrial: false,
      plan: "premium",
      paidAmount: amount,
      guests: maxGuests,

      includeCalls: !!includeCalls,
      includeCreditGifts: false,
      isDemoUser: false,
    });

    const magicLink = `${BASE_URL}/set-password?token=${resetPasswordToken}`;

    console.log("📧 Sending magic link to new user:", email);

    await resend.emails.send({
      from: "Invistimo <noreply@invistimo.com>",
      to: email,
      subject: "הגדרת סיסמה לחשבון שלך",
      html: `
        <div style="font-family:Heebo,Arial,sans-serif;direction:rtl;text-align:right">
          <h2>ברוך הבא לאינויסטימו 🎉</h2>
          <p>המפיק שלך יצר עבורך חשבון חדש.</p>
          <p>להגדרת סיסמה ולכניסה למערכת:</p>
          <a href="${magicLink}"
            style="display:inline-block;margin-top:12px;padding:10px 20px;background:#6c3aff;color:white;text-decoration:none;border-radius:6px">
            הגדר סיסמה
          </a>
          <p style="margin-top:16px;font-size:14px;color:#555">
            הקישור תקף ל־24 שעות.
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      user: newUser,
    });
  } catch (err) {
    console.error("❌ create-client error:", err);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
