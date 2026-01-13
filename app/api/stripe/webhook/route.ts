import Stripe from "stripe";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import Event from "@/models/Event";
import { notifyAdminPurchase } from "@/lib/notifyAdminPurchase";

export const runtime = "nodejs";

/* ============================================================
   Stripe instance
============================================================ */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

/* ============================================================
   lookup_key → maxGuests
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
  try {

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();
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

  if (session.payment_status !== "paid") {
  console.warn("⚠️ Checkout session not paid yet", {
    sessionId: session.id,
    paymentStatus: session.payment_status,
  });
  return NextResponse.json({ received: true });
}

if (!session.payment_intent) {
  console.warn("⚠️ Missing payment_intent on paid session", {
    sessionId: session.id,
  });
  return NextResponse.json({ received: true });
}


  /* ============================================================
     Prevent duplicate processing
============================================================ */
  const existingPayment = await Payment.findOne({
    stripePaymentIntentId: String(session.payment_intent),
  });

  if (existingPayment) {
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
    console.error("❌ User not found for payment");
    return NextResponse.json({ received: true });
  }

  const email = user.email;

  /* ============================================================
     Ensure Event exists (⚠️ תואם לסכמה החדשה)
============================================================ */
  let event = await Event.findOne({ userId: user._id });

  if (!event) {
    event = await Event.create({
      userId: user._id,
      email,
      eventType: "wedding",
      title: "",
      date: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
      time: "",
      maxGuests: 0,
      zones: [],
      status: "active",
    });
  }

  /* ============================================================
     Load Invitation (אם קיים)
============================================================ */
  let invitation = await Invitation.findOne({ ownerId: user._id });

  /* ============================================================
     CASE 1: PREMIUM UPGRADE
============================================================ */
  if (session.metadata?.type === "upgrade") {
    const targetGuests = Number(session.metadata.targetGuests || 0);
    const amountCharged = Number(session.metadata.amountCharged || 0);
    const smsToAdd = targetGuests * 3;

    await Payment.create({
      email,
      stripeSessionId: session.id,
      stripePaymentIntentId: String(session.payment_intent),
      stripeCustomerId: session.customer as string,
      type: "upgrade",
      priceKey: `premium_${targetGuests}`,
      maxGuests: targetGuests,
      amount: amountCharged,
      currency: "ils",
      status: "paid",
      isTest: false,
    });

    await User.findByIdAndUpdate(user._id, {
      plan: "premium",
      hasPaid: true, 
      $inc: {
        guests: targetGuests,
        paidAmount: amountCharged,
      },
    });

    event.maxGuests += targetGuests;
    await event.save();

    if (!invitation) {
      invitation = await Invitation.create({
        ownerId: user._id,
        title: "ההזמנה שלי",
        canvasData: {},
        shareId: crypto.randomUUID(),
        maxGuests: targetGuests,
        sentSmsCount: 0,
        maxMessages: smsToAdd,
        remainingMessages: smsToAdd,
      });
    } else {
      invitation.maxGuests += targetGuests;
      invitation.maxMessages += smsToAdd;
      invitation.remainingMessages += smsToAdd;
      await invitation.save();
    }

    return NextResponse.json({ received: true });
  }

  /* ============================================================
     CASE 2: SMS ADD-ON
============================================================ */
  if (session.metadata?.type === "addon") {
    const messagesToAdd = Number(session.metadata.messages || 0);
    const amount = Number(session.metadata.amount || 0);

    await Payment.create({
      email,
      stripeSessionId: session.id,
      stripePaymentIntentId: String(session.payment_intent),
      stripeCustomerId: session.customer as string,
      type: "addon",
      amount,
      currency: "ils",
      status: "paid",
      isTest: false,
    });

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
      invitation.maxMessages += messagesToAdd;
      invitation.remainingMessages += messagesToAdd;
      await invitation.save();
    }

    return NextResponse.json({ received: true });
  }

  /* ============================================================
     CASE 3: FULL PACKAGE PURCHASE
============================================================ */
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 10,
  });

  const totalPaid =
    Number(session.metadata?.totalPaid) ||
    lineItems.data.reduce((sum, item) => {
      const unit = item.price?.unit_amount ?? 0;
      return sum + unit * (item.quantity ?? 1);
    }, 0) / 100;

  const priceKey = session.metadata?.priceKey || "";

  const maxGuests =
  Number(session.metadata?.maxGuests) ||
  GUESTS_BY_KEY[priceKey] ||
  Number(user?.guests) ||
  0;

if (!maxGuests) {
  console.error("⚠️ Cannot resolve maxGuests for package purchase", {
    sessionId: session.id,
    priceKey,
    metadata: session.metadata,
    userGuests: user?.guests,
  });

  // ❗ לא מפילים webhook
  return NextResponse.json({ received: true });
}

  const plan = session.metadata?.plan || "basic";
  const isBasic = plan === "basic";
  const messagesToAdd = isBasic ? 0 : maxGuests * 3;

  await Payment.create({
    email,
    stripeSessionId: session.id,
    stripePaymentIntentId: String(session.payment_intent),
    stripeCustomerId: session.customer as string,
    priceKey,
    maxGuests,
    amount: totalPaid,
    currency: "ils",
    type: "package",
    status: "paid",
    isTest: false,
  });

  await User.findByIdAndUpdate(user._id, {
    plan,
    guests: maxGuests,
    paidAmount: totalPaid,
    hasPaid: true, 
    isTrial: false,
  });

  event.maxGuests = maxGuests;
  await event.save();

  if (!invitation) {
    invitation = await Invitation.create({
      ownerId: user._id,
      title: "ההזמנה שלי",
      canvasData: {},
      shareId: crypto.randomUUID(),
      maxGuests,
      sentSmsCount: 0,
      maxMessages: messagesToAdd,
      remainingMessages: messagesToAdd,
    });
  } else {
    
    invitation.maxGuests = maxGuests;
invitation.maxMessages = messagesToAdd;
invitation.remainingMessages = messagesToAdd;


    await invitation.save();
  }

     try {
      await notifyAdminPurchase({
        email,
        amount: totalPaid,
        currency: "ils",
        type: plan === "basic" ? "Basic package" : "Premium package",
        details: `${maxGuests} אורחים`,
      });
    } catch (err) {
      console.error("⚠️ Failed to send admin purchase notification", err);
    }

    return NextResponse.json({ received: true });

  } catch (err) {
    console.error("🔥 Stripe webhook fatal error:", err);
    return NextResponse.json({ received: true });
  }
}