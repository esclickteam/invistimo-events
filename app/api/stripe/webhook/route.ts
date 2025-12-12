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
   lookup_key → maxGuests (רכישה רגילה)
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
    console.error("❌ Missing customer email");
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const user = await User.findOne({ email });
  if (!user) {
    console.error("❌ User not found for email:", email);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  /* ============================================================
     🔁 CASE 1: UPGRADE (metadata-based)
  ============================================================ */
  if (session.metadata?.type === "upgrade") {
    const targetGuests = Number(session.metadata.targetGuests);
    const fullPrice = Number(session.metadata.fullPrice);

    if (!targetGuests || !fullPrice) {
      console.error("❌ Invalid upgrade metadata:", session.metadata);
      return NextResponse.json({ error: "Invalid upgrade metadata" }, { status: 400 });
    }

    // סכום ששולם עכשיו (הפרש)
    const amountPaidNow = (session.amount_total ?? 0) / 100;

    /* ------------------------------------------------------------
       Create Payment record (upgrade)
    ------------------------------------------------------------ */
    const payment = await Payment.create({
      email,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent as string,
      stripeCustomerId: session.customer as string,
      type: "upgrade",
      maxGuests: targetGuests,
      amount: amountPaidNow,
      currency: session.currency,
      status: "paid",
    });

    /* ------------------------------------------------------------
       Update user (FINAL truth)
    ------------------------------------------------------------ */
    await User.findByIdAndUpdate(user._id, {
      plan: "premium",
      guests: targetGuests,
      paidAmount: fullPrice,
      planLimits: {
        maxGuests: targetGuests,
        smsEnabled: true,
        seatingEnabled: true,
        remindersEnabled: true,
      },
    });

    return NextResponse.json({ received: true });
  }

  /* ============================================================
     🛒 CASE 2: REGULAR PURCHASE (priceKey-based)
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

  const maxGuests = GUESTS_BY_KEY[priceKey];
  const amountPaid = (price.unit_amount ?? 0) / 100;

  /* ------------------------------------------------------------
     Create Payment record (regular)
  ------------------------------------------------------------ */
  const payment = await Payment.create({
    email,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent as string,
    stripeCustomerId: session.customer as string,
    priceKey,
    maxGuests,
    amount: amountPaid,
    currency: price.currency,
    status: "paid",
  });

  /* ------------------------------------------------------------
     Create Event (first-time only)
  ------------------------------------------------------------ */
  let eventDoc = await Event.findOne({ userId: user._id });

  if (!eventDoc) {
    eventDoc = await Event.create({
      userId: user._id,
      title: "האירוע שלי",
      eventType: "אירוע",
    });
  }

  /* ------------------------------------------------------------
     Update user
  ------------------------------------------------------------ */
  await User.findByIdAndUpdate(user._id, {
    plan: priceKey === "basic" ? "basic" : "premium",
    guests: maxGuests,
    paidAmount: amountPaid,
    planLimits: {
      maxGuests,
      smsEnabled: priceKey !== "basic",
      seatingEnabled: priceKey !== "basic",
      remindersEnabled: priceKey !== "basic",
    },
  });

  payment.eventId = eventDoc._id;
  await payment.save();

  return NextResponse.json({ received: true });
}
