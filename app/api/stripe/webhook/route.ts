import Stripe from "stripe";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Event from "@/models/Event";

export const runtime = "nodejs";

/* ============================================================
   Stripe instance — MUST match Dashboard API version
============================================================ */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

/* ============================================================
   lookup_key → maxGuests
============================================================ */
const GUESTS_BY_KEY: Record<string, number> = {
  basic: 50,
  premium_100: 100,
  premium_300: 300,
  premium_500: 500,
  premium_1000: 1000,
};

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let stripeEvent: Stripe.Event;

  /* ============================================================
     Verify webhook signature
  ============================================================ */
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

  /* ============================================================
     We only care about successful checkout
  ============================================================ */
  if (stripeEvent.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  await connectDB();

  const session = stripeEvent.data.object as Stripe.Checkout.Session;

  /* ============================================================
     Get purchased price
  ============================================================ */
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 1,
  });

  const price = lineItems.data[0]?.price;
  const priceKey = price?.lookup_key;

  if (!priceKey || !GUESTS_BY_KEY[priceKey]) {
    console.error("❌ Unknown priceKey:", priceKey);
    return NextResponse.json({ error: "Unknown priceKey" }, { status: 400 });
  }

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
     Create Payment record
  ============================================================ */
  const payment = await Payment.create({
    email: session.customer_email!,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent as string,
    stripeCustomerId: session.customer as string,
    priceKey,
    maxGuests: GUESTS_BY_KEY[priceKey],
    amount: (price.unit_amount ?? 0) / 100,
    currency: price.currency,
    status: "paid",
  });

  /* ============================================================
     Create Event (first-time)
  ============================================================ */
  const eventDoc = await Event.create({
    title: "האירוע שלי",
    eventType: "אירוע",
  });

  /* ============================================================
     Link Payment → Event
  ============================================================ */
  payment.eventId = eventDoc._id;
  await payment.save();

  return NextResponse.json({ received: true });
}
