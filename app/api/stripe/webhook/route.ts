import Stripe from "stripe";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Event from "@/models/Event";
import User from "@/models/User";

export const runtime = "nodejs";

/* ============================================================
   Stripe instance — MUST match Dashboard API version
============================================================ */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

/* ============================================================
   lookup_key → maxGuests
   null = UNLIMITED
============================================================ */
const GUESTS_BY_KEY: Record<string, number | null> = {
  // BASIC — ללא הגבלה
  basic_plan: null,
  basic_plan_49: null,

  // PREMIUM
  premium_100: 100,
  premium_300: 300,
  premium_500: 500,
  premium_1000: 1000,
};

/* ============================================================
   MAIN HANDLER
============================================================ */
export async function POST(req: Request) {
  console.log("✅ Stripe webhook called");

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Invalid webhook signature:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (stripeEvent.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  await connectDB();

  const session = stripeEvent.data.object as Stripe.Checkout.Session;

  /* ============================================================
     Prevent duplicate processing
  ============================================================ */
  const existingPayment = await Payment.findOne({
    stripeSessionId: session.id,
  });

  if (existingPayment) {
    return NextResponse.json({ received: true });
  }

  /* ============================================================
     Identify user
  ============================================================ */
  const email = session.customer_email;
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  /* ============================================================
     Get priceKey
  ============================================================ */
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 1,
    expand: ["data.price.product"],
  });

  const price = lineItems.data[0]?.price;
  const priceKey = price?.lookup_key;
  const priceId = price?.id;

  if (!priceKey || !(priceKey in GUESTS_BY_KEY)) {
    return NextResponse.json({ error: "Unknown priceKey" }, { status: 400 });
  }

  const maxGuests = GUESTS_BY_KEY[priceKey];
  const amountPaid = (price.unit_amount ?? 0) / 100;

  const isBasic = priceKey.startsWith("basic");

  /* ============================================================
     Create Payment
  ============================================================ */
  const payment = await Payment.create({
    email,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent as string,
    stripeCustomerId: session.customer as string,
    stripePriceId: priceId,
    priceKey,
    maxGuests,
    amount: amountPaid,
    currency: price.currency,
    status: "paid",
  });

  /* ============================================================
     Create Event (if not exists)
  ============================================================ */
  let eventDoc = await Event.findOne({ userId: user._id });

  if (!eventDoc) {
    eventDoc = await Event.create({
      userId: user._id,
      email,
      title: "האירוע שלי",
      eventType: "אירוע",
      maxGuests,
      stripeSessionId: session.id,
      stripePriceId: priceId,
      paymentStatus: "paid",
      status: "active",
    });
  }

  /* ============================================================
     Update User — BASIC ללא הגבלות
  ============================================================ */
  await User.findByIdAndUpdate(user._id, {
    plan: isBasic ? "basic" : "premium",
    guests: maxGuests, // null = unlimited
    paidAmount: amountPaid,
    planLimits: {
      maxGuests,
      smsEnabled: true,
      seatingEnabled: true,
      remindersEnabled: true,
    },
  });

  payment.eventId = eventDoc._id;
  await payment.save();

  console.log("✅ Payment processed successfully for:", email);
  return NextResponse.json({ received: true });
}
