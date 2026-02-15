import Stripe from "stripe";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { notifyAdminPurchase } from "@/lib/notifyAdminPurchase";
import { sendPasswordSetupMail } from "@/lib/sendPasswordSetupMail";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   Stripe instance
============================================================ */

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
});

/* ============================================================
   Helpers
============================================================ */

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(v: unknown): boolean {
  return String(v ?? "").toLowerCase() === "true";
}

/* ============================================================
   PLAN AUTHORITY
============================================================ */

function getPlanDefaults(plan: string, guests: number) {
  switch (plan) {
    case "plan1":
      return {
        planLimits: {
          maxGuests: guests,
          smsEnabled: true,
          remindersEnabled: true,
          seatingEnabled: false,
        },
        includeCalls: false,
        includeCreditGifts: false,
      };

    case "plan2":
      return {
        planLimits: {
          maxGuests: guests,
          smsEnabled: true,
          remindersEnabled: true,
          seatingEnabled: false,
        },
        includeCalls: true,
        includeCreditGifts: false,
      };

    case "plan3":
      return {
        planLimits: {
          maxGuests: guests,
          smsEnabled: true,
          remindersEnabled: true,
          seatingEnabled: true,
        },
        includeCalls: true,
        includeCreditGifts: true,
      };

    default:
      return {
        planLimits: {
          maxGuests: guests,
          smsEnabled: false,
          remindersEnabled: false,
          seatingEnabled: false,
        },
        includeCalls: false,
        includeCreditGifts: false,
      };
  }
}

/* ============================================================
   WEBHOOK
============================================================ */

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.log("❌ Missing Stripe signature");
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
      console.log("❌ Stripe event type is not checkout.session.completed");
      return NextResponse.json({ received: true });
    }

    await connectDB();

    const session = stripeEvent.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      console.log("❌ Payment not successful");
      return NextResponse.json({ received: true });
    }

    if (!session.payment_intent) {
      console.log("❌ Missing payment intent");
      return NextResponse.json({ received: true });
    }

    /* ============================================================
       IDENTIFY USER
    ============================================================ */

    let user: any = null;

    if (session.metadata?.userId) {
      user = await User.findById(session.metadata.userId);
    }

    if (!user && session.customer_email) {
      user = await User.findOne({
        email: session.customer_email.toLowerCase(),
      });
    }

    if (!user) {
      console.error("❌ User not found for payment");
      return NextResponse.json({ received: true });
    }

    console.log("✅ User found:", user.email);

    /* ============================================================
       HANDLE PRICING + ADMIN
    ============================================================ */

    if (
      session.metadata?.source === "pricing" ||
      session.metadata?.source === "admin"
    ) {
      const paymentIntentId = String(session.payment_intent);
      const amount = toNum(session.amount_total, 0) / 100;

      /* ================= CREATE PAYMENT (ONCE) ================= */

      const existingPayment = await Payment.findOne({
        stripePaymentIntentId: paymentIntentId,
      }).lean();

      if (!existingPayment) {
        await Payment.create({
          email: (user.email || "").toLowerCase(),
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          stripeCustomerId: (session.customer as string) || "",
          amount,
          currency: (session.currency || "ils").toLowerCase(),
          status: "paid",
          type: "package",
          isTest: !session.livemode,
          meta: {
            source: session.metadata?.source,
            stripeEventId: stripeEvent.id,
            plan: session.metadata?.plan ?? null,
            guests: session.metadata?.guests ?? null,
          },
        });
      }

      /* ============================================================
         PREVENT DOUBLE PROCESS (BUT NOT PASSWORD MAIL)
      ============================================================ */

      if (user.hasPaid && !user.needsPasswordSetup) {
        console.log("❌ Payment already processed, skipping password email.");
        return NextResponse.json({ received: true });
      }

      /* ================= PASSWORD TOKEN ================= */

      const passwordToken = crypto.randomBytes(32).toString("hex");
      const passwordExpires = Date.now() + 1000 * 60 * 60 * 24;

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
          hasPaid: true,
          paidAmount: amount,
          billingSource: session.metadata?.source,
          isTrial: false,
          hasDashboardAccess: true,
          isActive: false,
          plan: session.metadata?.plan,
          guests: session.metadata?.guests,
          resetPasswordToken: passwordToken,
          resetPasswordExpires: passwordExpires,
          needsPasswordSetup: true,
          updatedAt: new Date(),
        },
        { new: true }
      );

      /* ============================================================
         SEND PASSWORD SETUP EMAIL (ONCE)
      ============================================================ */

      console.log("✅ Sending password setup email to", updatedUser.email);

      if (updatedUser.needsPasswordSetup) {
        try {
          await sendPasswordSetupMail(updatedUser.email, passwordToken);
          console.log(`✅ Password setup email sent to ${updatedUser.email}`);
        } catch (err) {
          console.error("❌ Failed to send password setup email", err);
        }
      }

      /* ================= ADMIN NOTIFY ================= */

      await notifyAdminPurchase({
        email: user.email,
        amount,
        currency: "ils",
        type:
          session.metadata?.source === "admin"
            ? "Admin payment"
            : "New registration",
        details: `plan=${session.metadata?.plan} | guests=${session.metadata?.guests}`,
      });

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("🔥 Stripe webhook fatal error:", err);
    return NextResponse.json({ received: true });
  }
}
