import Stripe from "stripe";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
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
  console.log("🟢 Stripe webhook called");

  try {
    /* ================= SIGNATURE ================= */
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("❌ Missing stripe-signature header");
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

    console.log("📦 Stripe event type:", stripeEvent.type);

    if (stripeEvent.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    await connectDB();
    console.log("✅ MongoDB connected");

    const session = stripeEvent.data.object as Stripe.Checkout.Session;

    console.log("💳 Session ID:", session.id);
    console.log("💳 Payment status:", session.payment_status);

    if (session.payment_status !== "paid") {
      console.warn("⚠️ Session not paid");
      return NextResponse.json({ received: true });
    }

    if (!session.payment_intent) {
      console.warn("⚠️ Missing payment_intent");
      return NextResponse.json({ received: true });
    }

    /* ================= DUPLICATE PROTECTION ================= */
    const existingPayment = await Payment.findOne({
      stripePaymentIntentId: String(session.payment_intent),
    });

    if (existingPayment) {
      console.warn("⚠️ Duplicate payment ignored", session.payment_intent);
      return NextResponse.json({ received: true });
    }

    /* ================= IDENTIFY USER ================= */
    let user: any = null;

    if (session.metadata?.userId) {
      console.log("🔍 Looking for user by metadata.userId");
      user = await User.findById(session.metadata.userId);
    }

    if (!user && session.customer_email) {
      console.log("🔍 Looking for user by customer_email");
      user = await User.findOne({ email: session.customer_email });
    }

    if (!user) {
      console.error("❌ User not found for payment", {
        customer_email: session.customer_email,
        metadata: session.metadata,
      });
      return NextResponse.json({ received: true });
    }

    console.log("👤 User found:", user._id, user.email);
    const email = user.email;

    /* ================= ENSURE EVENT EXISTS ================= */
    let event = await Event.findOne({ userId: user._id });

    if (!event) {
      console.log("📅 Creating new event for user");
      event = await Event.create({
        userId: user._id,
        email,
        eventType: "wedding",
        title: "",
        date: new Date().toISOString().slice(0, 10),
        time: "",
        maxGuests: 0,
        zones: [],
        status: "active",
      });
    }

    /* ============================================================
       CASE 1: PREMIUM UPGRADE
    ============================================================ */
    if (session.metadata?.type === "upgrade") {
      console.log("⬆️ Processing PREMIUM UPGRADE");

      const targetGuests = Number(session.metadata.targetGuests || 0);
      const amountCharged = Number(session.metadata.amountCharged || 0);

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

      console.log("📧 Sending admin email (upgrade)");
      try {
        await notifyAdminPurchase({
          email,
          amount: amountCharged,
          currency: "ils",
          type: "Premium upgrade",
          details: `${targetGuests} אורחים נוספים`,
        });
        console.log("✅ Admin email sent (upgrade)");
      } catch (err) {
        console.error("❌ Failed to send admin email (upgrade)", err);
      }

      return NextResponse.json({ received: true });
    }

    /* ============================================================
       CASE 2: SMS ADD-ON
    ============================================================ */
    if (session.metadata?.type === "addon") {
      console.log("💬 Processing SMS ADD-ON");

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

      await User.findByIdAndUpdate(user._id, {
        $inc: {
          paidAmount: amount,
        },
      });

      console.log("📧 Sending admin email (addon)");
      try {
        await notifyAdminPurchase({
          email,
          amount,
          currency: "ils",
          type: "SMS Add-on",
          details: `${messagesToAdd} הודעות`,
        });
        console.log("✅ Admin email sent (addon)");
      } catch (err) {
        console.error("❌ Failed to send admin email (addon)", err);
      }

      return NextResponse.json({ received: true });
    }

    /* ============================================================
       CASE 3: FULL PACKAGE PURCHASE
    ============================================================ */
    console.log("📦 Processing FULL PACKAGE");

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
      console.error("⚠️ Cannot resolve maxGuests", {
        sessionId: session.id,
        priceKey,
      });
      return NextResponse.json({ received: true });
    }

    const plan = session.metadata?.plan || "basic";

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

    console.log("📧 Sending admin email (package)");
    try {
      await notifyAdminPurchase({
        email,
        amount: totalPaid,
        currency: "ils",
        type: plan === "basic" ? "Basic package" : "Premium package",
        details: `${maxGuests} אורחים`,
      });
      console.log("✅ Admin email sent (package)");
    } catch (err) {
      console.error("❌ Failed to send admin email (package)", err);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("🔥 Stripe webhook fatal error:", err);
    return NextResponse.json({ received: true });
  }
}
