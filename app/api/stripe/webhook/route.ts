import Stripe from "stripe";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { notifyAdminPurchase } from "@/lib/notifyAdminPurchase";
import { sendPasswordSetupMail } from "@/lib/sendPasswordSetupMail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   Stripe instance
============================================================ */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

/* ============================================================
   Helpers
============================================================ */
function toBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(s)) return true;
  if (["false", "0", "no", "off"].includes(s)) return false;
  return fallback;
}

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* ============================================================
   WEBHOOK HANDLER
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

    console.log("🔔 Stripe webhook:", stripeEvent.type, "| id:", stripeEvent.id);

    if (stripeEvent.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    await connectDB();

    const session = stripeEvent.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      console.log("ℹ️ checkout.session.completed but not paid:", session.id);
      return NextResponse.json({ received: true });
    }

    if (!session.payment_intent) {
      console.log("ℹ️ Missing payment_intent:", session.id);
      return NextResponse.json({ received: true });
    }

    /* ================= IDENTIFY USER ================= */
    let user: any = null;

    if (session.metadata?.userId) {
      user = await User.findById(session.metadata.userId);
    }

    if (!user && session.customer_email) {
      user = await User.findOne({ email: session.customer_email.toLowerCase() });
    }

    if (!user) {
      console.error("❌ User not found for payment", {
        email: session.customer_email,
        metadata: session.metadata,
        sessionId: session.id,
      });
      return NextResponse.json({ received: true });
    }

    /* ============================================================
       CASE: NEW REGISTRATION – PRICING
    ============================================================ */
    if (session.metadata?.source === "pricing") {
      const amountFromMeta = toNum(session.metadata.amount, 0);
      const amountFromStripe = toNum(session.amount_total, 0) / 100;
      const amount = amountFromMeta > 0 ? amountFromMeta : amountFromStripe;

      if (amount <= 0) {
        console.error("❌ Missing/invalid amount in pricing payment", {
          metadataAmount: session.metadata?.amount,
          amount_total: session.amount_total,
          sessionId: session.id,
        });
        return NextResponse.json({ received: true });
      }

      const paymentIntentId = String(session.payment_intent);

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
            source: "pricing",
            stripeEventId: stripeEvent.id,
            plan: session.metadata?.plan ?? null,
            guests: session.metadata?.guests ?? null,
            seatingEnabled: session.metadata?.seatingEnabled ?? null,
            includeCalls: session.metadata?.includeCalls ?? null,
            callsAddonPrice: session.metadata?.callsAddonPrice ?? null,
            includeCreditGifts: session.metadata?.includeCreditGifts ?? null,
            creditGiftsAddonPrice: session.metadata?.creditGiftsAddonPrice ?? null,
            smsPerRecord: session.metadata?.smsPerRecord ?? null,
            maxMessages: session.metadata?.maxMessages ?? null,
          },
        });
      }

      const plan = String(session.metadata?.plan || user.plan || "basic");
      const guests = toNum(session.metadata?.guests, user.guests || 0);

      const seatingEnabled = toBool(
        session.metadata?.seatingEnabled,
        !!user?.planLimits?.seatingEnabled
      );

      const includeCalls = toBool(session.metadata?.includeCalls, !!user?.includeCalls);
      const callsAddonPrice = toNum(session.metadata?.callsAddonPrice, user?.callsAddonPrice || 0);

      const includeCreditGifts = toBool(
        session.metadata?.includeCreditGifts,
        !!user?.includeCreditGifts
      );
      const creditGiftsAddonPrice = toNum(
        session.metadata?.creditGiftsAddonPrice,
        user?.creditGiftsAddonPrice || 0
      );

      const smsPerRecord = toNum(session.metadata?.smsPerRecord, user?.smsPerRecord || 0);
      const maxMessages = toNum(session.metadata?.maxMessages, user?.maxMessages || 0);

      const currentPlanLimits = user?.planLimits || {};

      const nextPlanLimits = {
        ...currentPlanLimits,
        maxGuests: guests,
        seatingEnabled,
      };

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
          hasPaid: true,
          paidAmount: amount,
          billingSource: "pricing",
          isTrial: false,
          hasDashboardAccess: true,
          isActive: false,
          plan,
          guests,
          planLimits: nextPlanLimits,
          includeCalls,
          callsAddonPrice,
          includeCreditGifts,
          creditGiftsAddonPrice,
          smsPerRecord,
          maxMessages,
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (updatedUser?.needsPasswordSetup) {
        try {
          await sendPasswordSetupMail(updatedUser._id.toString());
        } catch (err) {
          console.error("❌ Failed to send password setup email", err);
        }
      }

      try {
        await notifyAdminPurchase({
          email: user.email,
          amount,
          currency: "ils",
          type: "New registration",
          details: `Pricing page | plan=${plan} | guests=${guests} | seating=${seatingEnabled} | calls=${includeCalls}`,
        });
      } catch (err) {
        console.error("❌ Failed to notify admin", err);
      }

      return NextResponse.json({ received: true });
    }

    /* ============================================================
       CASE: SEATING UPGRADE (Plan1=100₪ | Plan2=80₪)
    ============================================================ */
    if (session.metadata?.type === "seating-upgrade") {
      const amountFromStripe = toNum(session.amount_total, 0) / 100;

      if (amountFromStripe <= 0) {
        console.error("❌ Invalid upgrade amount", session.id);
        return NextResponse.json({ received: true });
      }

      const paymentIntentId = String(session.payment_intent);

      const existingPayment = await Payment.findOne({
        stripePaymentIntentId: paymentIntentId,
      }).lean();

      if (!existingPayment) {
        await Payment.create({
          email: (user.email || "").toLowerCase(),
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          stripeCustomerId: (session.customer as string) || "",
          amount: amountFromStripe,
          currency: (session.currency || "ils").toLowerCase(),
          status: "paid",
          type: "upgrade",
          isTest: !session.livemode,
          meta: {
            source: "seating-upgrade",
            stripeEventId: stripeEvent.id,
            currentPlan: user.plan ?? null,
          },
        });
      }

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
          "planLimits.seatingEnabled": true,
          updatedAt: new Date(),
        },
        { new: true }
      );

      try {
        await notifyAdminPurchase({
          email: user.email,
          amount: amountFromStripe,
          currency: "ils",
          type: "Seating Upgrade",
          details: `Plan=${user.plan}`,
        });
      } catch (err) {
        console.error("❌ Failed to notify admin (upgrade)", err);
      }

      return NextResponse.json({ received: true });
    }

    /* ============================================================
       FALLBACK – legacy flows
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
