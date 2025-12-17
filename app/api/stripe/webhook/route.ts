import Stripe from "stripe";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";

import Payment from "@/models/Payment";
import User from "@/models/User";
import Invitation from "@/models/Invitation";

export const runtime = "nodejs";

/* ============================================================
   Stripe instance
============================================================ */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

/* ============================================================
   lookup_key → maxGuests (FULL PACKAGES ONLY)
============================================================ */
const GUESTS_BY_KEY: Record<string, number> = {
  basic_plan: 100,
  basic_plan_49: 100,
  premium_100: 100,
  premium_200: 200,
  premium_300: 300,
  premium_400: 400,
  premium_500: 500,
  premium_600: 600,
  premium_700: 700,
  premium_800: 800,
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

  /* ================= Prevent duplicate ================= */
  const existingPayment = await Payment.findOne({
    stripeSessionId: session.id,
  });
  if (existingPayment) {
    return NextResponse.json({ received: true });
  }

  /* ================= Identify user ================= */
  const email = session.customer_email;
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  /* ============================================================
     🟢 CASE 1: PREMIUM UPGRADE
     ➕ אורחים
     ➕ SMS = (אורחים ששודרגו × 3)
     ➕ הושבה
  ============================================================ */
  if (session.metadata?.type === "upgrade") {
    const targetGuests = Number(session.metadata.targetGuests); // כמה נוספו
    const fullPrice = Number(session.metadata.fullPrice);
    const amountCharged = Number(session.metadata.amountCharged);

    if (!targetGuests || !fullPrice || !amountCharged) {
      return NextResponse.json({ received: true });
    }

    const currentGuests = user.guests || 0;
    const newTotalGuests = currentGuests + targetGuests;

    // ⭐ SMS רק על השדרוג (3 הודעות לכל אורח)
    const smsToAdd = targetGuests * 3;

    const priceKey = `premium_${targetGuests}`;

    /* 💾 Payment */
    await Payment.create({
      email,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent as string,
      stripeCustomerId: session.customer as string,
      priceKey,
      maxGuests: newTotalGuests,
      amount: amountCharged,
      currency: "ils",
      status: "paid",
    });

    /* 🧑 Update User */
    await User.findByIdAndUpdate(user._id, {
      plan: "premium",
      guests: newTotalGuests,
      paidAmount: fullPrice,
      planLimits: {
        maxGuests: newTotalGuests,
        smsEnabled: true,
        seatingEnabled: true,
        remindersEnabled: true,
      },
    });

    /* ✉️ Update Invitation + SMS
       ❗ SMS ניתן רק אם עדיין לא הייתה חבילת SMS */
    let invitation = await Invitation.findOne({ ownerId: user._id });

    if (!invitation) {
      invitation = await Invitation.create({
        ownerId: user._id,
        title: "ההזמנה שלי",
        canvasData: {},
        shareId: crypto.randomUUID(),
        maxGuests: newTotalGuests,
        sentSmsCount: 0,
        maxMessages: smsToAdd,
        remainingMessages: smsToAdd,
      });
    } else {
      invitation.maxGuests = newTotalGuests;

      // ✅ חשוב: לא להוסיף SMS שוב אם כבר קיים
      if (!invitation.maxMessages || invitation.maxMessages === 0) {
        invitation.maxMessages = smsToAdd;
        invitation.remainingMessages = smsToAdd;
      }

      await invitation.save();
    }

    console.log(
      `✅ Upgrade OK: ${email} | +${targetGuests} guests | +${smsToAdd} SMS`
    );

    return NextResponse.json({ received: true });
  }

  /* ============================================================
     🟢 CASE 2: SMS ADD-ON
  ============================================================ */
  if (session.metadata?.type === "addon") {
    const messagesToAdd = Number(session.metadata.messages || 0);
    if (messagesToAdd <= 0) {
      return NextResponse.json({ received: true });
    }

    let invitation = await Invitation.findOne({ ownerId: user._id });

    if (!invitation) {
      invitation = await Invitation.create({
        ownerId: user._id,
        title: "ההזמנה שלי",
        canvasData: {},
        shareId: crypto.randomUUID(),
        sentSmsCount: 0,
        maxMessages: messagesToAdd,
        remainingMessages: messagesToAdd,
      });
    } else {
      invitation.maxMessages =
        (invitation.maxMessages || 0) + messagesToAdd;

      invitation.remainingMessages =
        (invitation.remainingMessages || 0) + messagesToAdd;

      await invitation.save();
    }

    console.log(`✅ Added ${messagesToAdd} SMS to ${email}`);
    return NextResponse.json({ received: true });
  }

  /* ============================================================
     🟢 CASE 3: FULL PACKAGE PURCHASE
  ============================================================ */
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 1,
    expand: ["data.price.product"],
  });

  const lineItem = lineItems.data[0];
  const price = lineItem?.price;
  const priceKey = price?.lookup_key;

  if (!priceKey || !(priceKey in GUESTS_BY_KEY)) {
    return NextResponse.json({ error: "Unknown priceKey" }, { status: 400 });
  }

  const maxGuests = GUESTS_BY_KEY[priceKey];
  const amountPaid = (price?.unit_amount ?? 0) / 100;
  const isBasic = priceKey.startsWith("basic");

  await Payment.create({
    email,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent as string,
    stripeCustomerId: session.customer as string,
    stripePriceId: price?.id,
    priceKey,
    maxGuests,
    amount: amountPaid,
    currency: price?.currency,
    status: "paid",
  });

  await User.findByIdAndUpdate(user._id, {
    plan: isBasic ? "basic" : "premium",
    guests: maxGuests,
    paidAmount: amountPaid,
    planLimits: {
      maxGuests,
      smsEnabled: !isBasic,
      seatingEnabled: !isBasic,
      remindersEnabled: true,
    },
  });

  console.log("✅ Full package purchase processed for:", email);
  return NextResponse.json({ received: true });
}
