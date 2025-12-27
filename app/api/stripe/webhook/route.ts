import Stripe from "stripe";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";

import Payment from "@/models/Payment";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import { notifyAdminPurchase } from "@/lib/notifyAdminPurchase";

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

  premium_100_v2: 100,
  premium_200_v2: 200,
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
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.clone().text();

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

  console.log("📦 EVENT TYPE:", stripeEvent.type);

  // לוגים חשובים לזיהוי כישלונות או ביטולים
  if (
    stripeEvent.type === "checkout.session.expired" ||
    stripeEvent.type === "checkout.session.async_payment_failed"
  ) {
    const s = stripeEvent.data.object as Stripe.Checkout.Session;
    console.log("🕒 Checkout session did NOT complete:", {
      id: s.id,
      email: s.customer_email,
      payment_status: s.payment_status,
      status: s.status,
      metadata: s.metadata,
    });
    return NextResponse.json({ received: true });
  }

  // מטפלים רק ב־checkout.session.completed אמיתי
  if (stripeEvent.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  await connectDB();

  const session = stripeEvent.data.object as Stripe.Checkout.Session;

  // הגנה נוספת – לא לעבד תשלום אם לא שולם באמת
  if (session.payment_status !== "paid") {
    console.log("⚠️ checkout.session.completed but not paid:", {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
    });
    return NextResponse.json({ received: true });
  }

  if (!session.payment_intent) {
    return NextResponse.json({ received: true });
  }

  /* ============================================================
     Prevent duplicate payment processing
  ============================================================ */
  const existingPayment = await Payment.findOne({
    stripePaymentIntentId: String(session.payment_intent),
  });

  if (existingPayment) {
    console.log("⚠️ Payment already processed");
    return NextResponse.json({ received: true });
  }

  /* ============================================================
     Identify user
  ============================================================ */
  let user: any = null;

  if (session.metadata?.userId) {
    user = await User.findById(session.metadata.userId);
  }

  if (!user && session.customer_email) {
    user = await User.findOne({ email: session.customer_email });
  }

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const email = user.email;

  /* ============================================================
     🟢 CASE 1: PREMIUM UPGRADE (הוספת אורחים)
============================================================ */
  if (session.metadata?.type === "upgrade") {
    const targetGuests = Number(session.metadata.targetGuests);
    const amountCharged = Number(session.metadata.amountCharged);

    if (!targetGuests || !amountCharged) {
      return NextResponse.json({ received: true });
    }

    const currentGuests = user.guests || 0;
    const newTotalGuests = currentGuests + targetGuests;
    const smsToAdd = targetGuests * 3;

    await Payment.create({
      email,
      stripeSessionId: session.id,
      stripePaymentIntentId: String(session.payment_intent),
      stripeCustomerId: session.customer as string,
      priceKey: `premium_${targetGuests}`,
      maxGuests: newTotalGuests,
      amount: amountCharged,
      currency: "ils",
      status: "paid",
    });

    await User.findByIdAndUpdate(user._id, {
      plan: "premium",
      guests: newTotalGuests,
      paidAmount: (user.paidAmount || 0) + amountCharged,
      planLimits: {
        maxGuests: newTotalGuests,
        smsEnabled: true,
        seatingEnabled: true,
        remindersEnabled: true,
      },
    });

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
      invitation.maxMessages = (invitation.maxMessages || 0) + smsToAdd;
      invitation.remainingMessages =
        (invitation.remainingMessages || 0) + smsToAdd;

      await invitation.save();
    }

    console.log(
      `✅ Upgrade OK: ${email} | +${targetGuests} guests | +${smsToAdd} messages`
    );

    await notifyAdminPurchase({
      email,
      amount: amountCharged,
      currency: "ils",
      type: "Premium upgrade",
      details: `+${targetGuests} אורחים`,
    });

    return NextResponse.json({ received: true });
  }

  /* ============================================================
     🟢 CASE 2: SMS ADD-ON
============================================================ */
  if (session.metadata?.type === "addon") {
    const messagesToAdd = Number(session.metadata.messages || 0);
    if (messagesToAdd <= 0) return NextResponse.json({ received: true });

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
      invitation.maxMessages = (invitation.maxMessages || 0) + messagesToAdd;
      invitation.remainingMessages =
        (invitation.remainingMessages || 0) + messagesToAdd;
      await invitation.save();
    }

    console.log(`✅ Added ${messagesToAdd} SMS to ${email}`);

    await notifyAdminPurchase({
      email,
      amount: 0,
      currency: "ils",
      type: "SMS add-on",
      details: `+${messagesToAdd} הודעות`,
    });

    return NextResponse.json({ received: true });
  }

  /* ============================================================
     🟢 CASE 3: FULL PACKAGE PURCHASE (BASIC / PREMIUM)
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
  const maxMessages = isBasic ? 0 : maxGuests * 3;

  const oldPlan = user.plan;
  const newPlan = isBasic ? "basic" : "premium";

  await Payment.create({
    email,
    stripeSessionId: session.id,
    stripePaymentIntentId: String(session.payment_intent),
    stripeCustomerId: session.customer as string,
    stripePriceId: price?.id,
    priceKey,
    maxGuests,
    amount: amountPaid,
    currency: price?.currency,
    status: "paid",
  });

  await User.findByIdAndUpdate(user._id, {
    plan: newPlan,
    guests: maxGuests,
    paidAmount: amountPaid,
    planLimits: {
      maxGuests,
      smsEnabled: !isBasic,
      seatingEnabled: !isBasic,
      remindersEnabled: true,
    },
  });

  // 🚀 שדרוג מבסיס לפרימיום
  if (oldPlan === "basic" && newPlan === "premium") {
    console.log(`🚀 User upgraded from Basic → Premium: ${email}`);
    await notifyAdminPurchase({
      email,
      amount: amountPaid,
      currency: price?.currency || "ils",
      type: "Plan upgrade",
      details: `שדרוג מבסיס לפרימיום (${maxGuests} אורחים)`,
    });
  }

  let invitation = await Invitation.findOne({ ownerId: user._id });

  if (!invitation) {
    invitation = await Invitation.create({
      ownerId: user._id,
      title: "ההזמנה שלי",
      canvasData: {},
      shareId: crypto.randomUUID(),
      maxGuests,
      sentSmsCount: 0,
      maxMessages,
      remainingMessages: maxMessages,
    });
  } else {
    const sent = invitation.sentSmsCount || 0;
    invitation.maxGuests = maxGuests;
    invitation.maxMessages = maxMessages;
    invitation.remainingMessages = Math.max(0, maxMessages - sent);
    if (isBasic) invitation.sentSmsCount = 0;
    await invitation.save();
  }

  console.log(
    `✅ Full package OK: ${email} | ${maxGuests} guests | ${maxMessages} messages`
  );

  await notifyAdminPurchase({
    email,
    amount: amountPaid,
    currency: price?.currency || "ils",
    type: isBasic ? "Basic package" : "Premium package",
    details: `${maxGuests} אורחים`,
  });

  return NextResponse.json({ received: true });
}
