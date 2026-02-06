import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { Resend } from "resend";
import Stripe from "stripe";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Payment from "@/models/Payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   INIT
========================================================= */
const resend = new Resend(process.env.RESEND_API_KEY!);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

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
  guests: number; // ← כמות רשומות
  includeCalls?: boolean;
};

/* =========================================================
   CREATE CLIENT BY PRODUCER
========================================================= */
export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("🟢 create-client API hit");

  /* ================= AUTH ================= */
  const token = req.cookies.get("authToken")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let decoded: AuthTokenPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthTokenPayload;
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

  if (!email || !name || !guests) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const records = Number(guests);
  if (records <= 0) {
    return NextResponse.json(
      { error: "Invalid records amount" },
      { status: 400 }
    );
  }

  /* =========================================================
     PRICE CALCULATION – לפי מפיק
     (לא חבילות, לא טבלאות)
  ========================================================= */
  const pricePerRecord = producer.producerPricePerRecord;
  if (!pricePerRecord || pricePerRecord <= 0) {
    return NextResponse.json(
      { error: "Producer pricing not configured" },
      { status: 400 }
    );
  }

  const amount = records * pricePerRecord;

  /* ================= EXISTING USER ================= */
  const existingUser = await User.findOne({ email });

  let clientUser = existingUser;

  if (existingUser) {
    const resetPasswordToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    existingUser.resetPasswordToken = resetPasswordToken;
    existingUser.resetPasswordExpires = resetPasswordExpires;
    existingUser.needsPasswordSetup = true;
    existingUser.password = undefined as any;

    existingUser.guests = records;
    existingUser.maxMessages = records * 3;
    existingUser.includeCalls = !!includeCalls;
    existingUser.hasPaid = false;
    existingUser.paidAmount = 0;

    await existingUser.save();
  } else {
    const resetPasswordToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    clientUser = await User.create({
      name,
      email,
      phone: phone || "",

      role: "client",
      producerId: producer._id,
      createdByProducer: producer._id,

      guests: records,
      maxMessages: records * 3,
      includeCalls: !!includeCalls,

      hasPaid: false,
      paidAmount: 0,

      needsPasswordSetup: true,
      resetPasswordToken,
      resetPasswordExpires,
    });
  }

  /* =========================================================
     STRIPE CHECKOUT
  ========================================================= */
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: "ils",
          product_data: {
            name: `Invistimo – ${records} רשומות`,
          },
          unit_amount: amount * 100,
        },
        quantity: 1,
      },
    ],
    success_url: `${BASE_URL}/payment-success?userId=${clientUser!._id}`,
    cancel_url: `${BASE_URL}/payment-cancel`,
    metadata: {
      clientId: clientUser!._id.toString(),
      producerId: producer._id.toString(),
      records: String(records),
      amount: String(amount),
    },
  });

  /* ================= RESPONSE ================= */
  return NextResponse.json({
    success: true,
    checkoutUrl: session.url,
  });
}
