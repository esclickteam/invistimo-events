import Stripe from "stripe";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import Event from "@/models/Event";
import { notifyAdminPurchase } from "@/lib/notifyAdminPurchase";
import { sendPasswordSetupMail } from "@/lib/sendPasswordSetupMail";

export const runtime = "nodejs";

/* ============================================================
   Stripe instance
============================================================ */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

/* ============================================================
   WEBHOOK HANDLER
============================================================ */
export async function POST(req: Request) {
  try {
    /* ================= SIGNATURE ================= */
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

    /* ================= EVENT FILTER ================= */
    if (stripeEvent.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    await connectDB();

    const session = stripeEvent.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    if (!session.payment_intent) {
      return NextResponse.json({ received: true });
    }

    /* ================= DUPLICATE PROTECTION ================= */
    const existingPayment = await Payment.findOne({
      stripePaymentIntentId: String(session.payment_intent),
    });

    if (existingPayment) {
      return NextResponse.json({ received: true });
    }

    /* ================= IDENTIFY USER ================= */
    let user: any = null;

    if (session.metadata?.userId) {
      user = await User.findById(session.metadata.userId);
    }

    if (!user && session.customer_email) {
      user = await User.findOne({ email: session.customer_email });
    }

    if (!user) {
      console.error("❌ User not found for payment", {
        email: session.customer_email,
        metadata: session.metadata,
      });
      return NextResponse.json({ received: true });
    }

    /* ================= ENSURE EVENT ================= */
    let event = await Event.findOne({ userId: user._id });

    if (!event) {
      event = await Event.create({
        userId: user._id,
        email: user.email,
        status: "active",
      });
    }

    /* ============================================================
       CASE: NEW REGISTRATION – PRICE ONLY (Pricing Page)
    ============================================================ */
    if (session.metadata?.source === "pricing") {
      const amount = Number(session.metadata.amount || 0);

      if (!amount) {
        console.error("❌ Missing amount in pricing payment");
        return NextResponse.json({ received: true });
      }

      /* 💾 Save payment */
      await Payment.create({
        email: user.email,
        stripeSessionId: session.id,
        stripePaymentIntentId: String(session.payment_intent),
        stripeCustomerId: (session.customer as string) || "",
        amount,
        currency: "ils",
        status: "paid",
        type: "registration",
        isTest: false,
        meta: {
          source: "pricing",
        },
      });

      /* 👤 Activate user */
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
          hasPaid: true,
          paidAmount: amount,
          billingSource: "pricing",
          isTrial: false,
        },
        { new: true }
      );

      /* 📧 Password setup (once) */
      if (updatedUser?.needsPasswordSetup) {
        try {
          await sendPasswordSetupMail(updatedUser._id.toString());
        } catch (err) {
          console.error("❌ Failed to send password setup email", err);
        }
      }

      /* 🔔 Notify admin */
      try {
        await notifyAdminPurchase({
          email: user.email,
          amount,
          currency: "ils",
          type: "New registration",
          details: "Pricing page",
        });
      } catch (err) {
        console.error("❌ Failed to notify admin", err);
      }

      return NextResponse.json({ received: true });
    }

    /* ============================================================
       FALLBACK – legacy flows (kept for safety)
    ============================================================ */
    console.warn("⚠️ Unhandled Stripe session", {
      sessionId: session.id,
      metadata: session.metadata,
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("🔥 Stripe webhook fatal error:", err);
    return NextResponse.json({ received: true });
  }
}
