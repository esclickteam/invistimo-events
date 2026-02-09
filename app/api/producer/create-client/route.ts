import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import Stripe from "stripe";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   INIT
========================================================= */
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
  guests: number;
  includeCalls?: boolean;
};

/* =========================================================
   CREATE CLIENT BY PRODUCER
========================================================= */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    console.log("🟢 [CREATE CLIENT] API hit");

    /* ================= AUTH ================= */
    const producerToken = req.cookies.get("producerAuthToken")?.value ?? null;
    const authToken = req.cookies.get("authToken")?.value ?? null;
    const token = producerToken || authToken;

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
    if (!producerId) {
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 401 }
      );
    }

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
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { email, name, phone, guests, includeCalls } = body;

    if (!email || !name || !guests) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const records = Number(guests);
    if (!Number.isFinite(records) || records <= 0) {
      return NextResponse.json(
        { error: "Invalid records amount" },
        { status: 400 }
      );
    }

    /* ================= PRICE ================= */
    const pricePerRecord = Number(producer.producerPricePerRecord || 0);
    if (!Number.isFinite(pricePerRecord) || pricePerRecord <= 0) {
      return NextResponse.json(
        { error: "Producer pricing not configured" },
        { status: 400 }
      );
    }

    const amount = Number((records * pricePerRecord).toFixed(2));

    /* ================= PLAN ================= */
    const smsPerRecord = 3;
    const maxMessages = records * smsPerRecord;

    const planLimits = {
      maxGuests: records,
      smsEnabled: true,
      smsLimit: maxMessages,
      seatingEnabled: true,       // 🔑 זה מה שחסר לך
      remindersEnabled: true,
      callsEnabled: !!includeCalls,
    };

    /* ================= UPSERT CLIENT ================= */
    const existingUser = await User.findOne({ email });

    const resetPasswordToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    let clientUser;

    if (existingUser) {
      existingUser.name = name;
      existingUser.phone = phone || "";
      existingUser.role = "client";

      existingUser.plan = "premium";          // ✅ חובה
      existingUser.planLimits = planLimits;   // ✅ חובה

      existingUser.assignedProducerId = producer._id;
      existingUser.createdByProducer = true;
      existingUser.billingSource = "producer";

      existingUser.guests = records;
      existingUser.smsPerRecord = smsPerRecord;
      existingUser.maxMessages = maxMessages;
      existingUser.includeCalls = !!includeCalls;

      existingUser.hasPaid = false;
      existingUser.paidAmount = 0;

      existingUser.needsPasswordSetup = true;
      existingUser.resetPasswordToken = resetPasswordToken;
      existingUser.resetPasswordExpires = resetPasswordExpires;
      existingUser.password = undefined as any;

      await existingUser.save();
      clientUser = existingUser;
    } else {
      clientUser = await User.create({
        name,
        email,
        phone: phone || "",

        role: "client",

        plan: "premium",           // ✅ חובה
        planLimits,                // ✅ חובה

        assignedProducerId: producer._id,
        createdByProducer: true,
        billingSource: "producer",

        guests: records,
        smsPerRecord,
        maxMessages,
        includeCalls: !!includeCalls,

        hasPaid: false,
        paidAmount: 0,

        needsPasswordSetup: true,
        resetPasswordToken,
        resetPasswordExpires,
      });
    }

    /* ================= STRIPE ================= */
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
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${BASE_URL}/payment-success?userId=${clientUser._id}`,
      cancel_url: `${BASE_URL}/payment-cancel`,
      metadata: {
        paymentType: "producer-client",
        clientId: clientUser._id.toString(),
        producerId: producer._id.toString(),
        records: String(records),
        amount: String(amount),
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (err) {
    console.error("❌ create-client error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
