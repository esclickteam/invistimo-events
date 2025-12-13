import Stripe from "stripe"; 
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";

import Payment from "@/models/Payment";
import Event from "@/models/Event";
import User from "@/models/User";
import Invitation from "@/models/Invitation";

export const runtime = "nodejs";

/* ============================================================
   Stripe instance — MUST match Dashboard API version
============================================================ */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

/* ============================================================
   lookup_key → maxGuests
   null = UNLIMITED (basic)
============================================================ */
const GUESTS_BY_KEY: Record<string, number | null> = {
  basic_plan: null,
  basic_plan_49: null,

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
     Extract priceKey
  ============================================================ */
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 1,
    expand: ["data.price.product"],
  });

  const price = lineItems.data[0]?.price;
  const priceKey = price?.lookup_key;
  const priceId = price?.id;

  /* ============================================================
     🟢 אם מדובר ברכישת חבילת SMS נוספות
     נזהה לפי שם המוצר או ה-metadata ונעדכן יתרת הודעות
  ============================================================ */
  try {
    const productName =
      lineItems.data[0]?.description ||
      typeof lineItems.data[0]?.price?.product === "object"
  ? (lineItems.data[0]?.price?.product as Stripe.Product)?.name
  :
      "";
    const metadata = session.metadata || {};
    const description = (
      metadata.description ||
      productName ||
      ""
    ).toLowerCase();

    if (description.includes("הודעות") || description.includes("sms")) {
      console.log("💬 Detected SMS package purchase for:", email);

      const invitation = await Invitation.findOne({ ownerId: user._id });

      if (invitation) {
        // חילוץ כמות ההודעות מתוך שם המוצר (למשל "500 הודעות נוספות")
        const match = productName.match(/\d+/);
        const count = match ? parseInt(match[0]) : 0;

        if (count > 0) {
          invitation.maxMessages = (invitation.maxMessages || 0) + count;
          invitation.remainingMessages =
            (invitation.remainingMessages || 0) + count;
          await invitation.save();

          console.log(
            `✅ עודכנה יתרת הודעות SMS (${count}) למשתמש ${email}`
          );
        }
      }

      return NextResponse.json({ received: true });
    }
  } catch (err) {
    console.error("⚠️ שגיאה בעדכון יתרת הודעות:", err);
  }

  /* ============================================================
     המשך רגיל – רכישת חבילות רגילות
  ============================================================ */
  if (!priceKey || !(priceKey in GUESTS_BY_KEY)) {
    return NextResponse.json({ error: "Unknown priceKey" }, { status: 400 });
  }

  const maxGuests = GUESTS_BY_KEY[priceKey];
  const amountPaid = (price?.unit_amount ?? 0) / 100;
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
    currency: price?.currency,
    status: "paid",
  });

  /* ============================================================
     Create / Update Event
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
  } else {
    eventDoc.maxGuests = maxGuests;
    await eventDoc.save();
  }

  /* ============================================================
     🔑 UPDATE INVITATION — SOURCE OF TRUTH FOR SMS
  ============================================================ */
  let invitation = await Invitation.findOne({ ownerId: user._id });

  if (!invitation) {
    invitation = await Invitation.create({
      ownerId: user._id,
      title: "ההזמנה שלי",
      canvasData: {},
      shareId: crypto.randomUUID(),
      maxGuests,
      sentSmsCount: 0,
    });
  } else {
    invitation.maxGuests = maxGuests;
    invitation.sentSmsCount = 0; // איפוס בעת רכישת חבילה רגילה
    await invitation.save();
  }

  /* ============================================================
     Update User
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
