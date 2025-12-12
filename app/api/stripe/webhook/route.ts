import Stripe from "stripe";
import { NextResponse } from "next/server";
import Payment from "@/models/Payment";
import Event from "@/models/Event";
import connectDB from "@/lib/mongodb";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// 🔑 lookup_key → maxGuests
const GUESTS_BY_KEY: Record<string, number> = {
  basic: 50,
  premium_100: 100,
  premium_300: 300,
  premium_500: 500,
  premium_1000: 1000,
};

export async function POST(req: Request) {
  await connectDB();

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Invalid webhook signature", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  const price = lineItems.data[0]?.price;

  const priceKey = price?.lookup_key;
  if (!priceKey || !GUESTS_BY_KEY[priceKey]) {
    console.error("❌ Unknown priceKey:", priceKey);
    return NextResponse.json({ error: "Unknown priceKey" }, { status: 400 });
  }

  // 🛑 הגנה מכפילויות
  const existing = await Payment.findOne({
    stripeSessionId: session.id,
  });
  if (existing) {
    return NextResponse.json({ received: true });
  }

  // 💳 יצירת Payment
  const payment = await Payment.create({
    email: session.customer_email,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent,
    stripeCustomerId: session.customer,
    priceKey,
    maxGuests: GUESTS_BY_KEY[priceKey],
    amount: price.unit_amount! / 100,
    currency: price.currency,
    status: "paid",
  });

  // 🎉 יצירת Event
  const eventDoc = await Event.create({
    userEmail: payment.email,
    title: "האירוע שלי",
  });

  // 🔗 חיבור Payment → Event
  payment.eventId = eventDoc._id;
  await payment.save();

  return NextResponse.json({ received: true });
}
