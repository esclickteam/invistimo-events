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
      return NextResponse.json({ received: true });
    }

    if (!session.payment_intent) {
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
      console.error("❌ User not found for payment", {
        sessionId: session.id,
        paymentIntent: session.payment_intent,
        customerEmail: session.customer_email,
        metadata: session.metadata,
      });
      return NextResponse.json({ received: true });
    }

    /* ============================================================
       HANDLE SOURCES
    ============================================================ */

    const source = String(session.metadata?.source || "");

    // תומך גם בעסקאות ישנות/חדשות
    if (source !== "pricing" && source !== "admin") {
      return NextResponse.json({ received: true });
    }

    const paymentIntentId = String(session.payment_intent);
    const amount = toNum(session.amount_total, 0) / 100;

    // Idempotency: אם כבר נוצר payment על אותו intent לא ניצור שוב
    const existingPayment = await Payment.findOne({
      stripePaymentIntentId: paymentIntentId,
    }).lean();

    let createdPaymentNow = false;

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
          source, // דינמי
          stripeEventId: stripeEvent.id,
          plan: session.metadata?.plan ?? null,
          guests: session.metadata?.guests ?? null,
        },
      });
      createdPaymentNow = true;
    }

    /* ============================================================
       PREVENT DOUBLE ACTIVATION
    ============================================================ */

    if (user.hasPaid && user.paidAmount > 0) {
      // לא שולחים כאן מייל כדי למנוע כפילות במקרה של שני webhook endpoints
      return NextResponse.json({ received: true });
    }

    const plan = String(session.metadata?.plan || "plan1");
    const guests = toNum(session.metadata?.guests, 0);

    const base = getPlanDefaults(plan, guests);

    const addonSeating = toBool(session.metadata?.seatingEnabled);
    const addonCalls = toBool(session.metadata?.includeCalls);
    const addonCredit = toBool(session.metadata?.includeCreditGifts);
    const addonSelfManage = toBool(session.metadata?.selfManageEnabled);
    const addonCustomDesign = toBool(session.metadata?.customDesignEnabled);

    const finalPlanLimits = {
      ...base.planLimits,
      seatingEnabled: base.planLimits.seatingEnabled || addonSeating,
    };

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        hasPaid: true,
        paidAmount: amount,
        billingSource: source, // דינמי
        isTrial: false,
        hasDashboardAccess: true,

        // אם אצלך הכניסה תלויה ב-isActive, שקלי להחליף ל-true אחרי תשלום
        isActive: false,

        plan,
        guests,
        planLimits: finalPlanLimits,
        includeCalls: base.includeCalls || addonCalls,
        includeCreditGifts: base.includeCreditGifts || addonCredit,
        selfManageEnabled: addonSelfManage,
        customDesignEnabled: addonCustomDesign,
        updatedAt: new Date(),
      },
      { new: true }
    );

    /* ============================================================
       EMAILS
    ============================================================ */

    // מייל סיסמה שולחים רק אם נוצר payment עכשיו כדי למנוע כפילות
    if (updatedUser?.needsPasswordSetup && createdPaymentNow) {
      try {
        console.log("📨 Sending password setup email to:", updatedUser.email);
        await sendPasswordSetupMail(updatedUser._id.toString());
        console.log("✅ Password setup email sent to:", updatedUser.email);
      } catch (err) {
        console.error("❌ Failed to send password setup email", err);
      }
    }

    try {
      await notifyAdminPurchase({
        email: user.email,
        amount,
        currency: (session.currency || "ils").toLowerCase(),
        type: "New registration",
        details: `source=${source} | plan=${plan} | guests=${guests}`,
      });
    } catch (err) {
      console.error("❌ Failed to notify admin", err);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("🔥 Stripe webhook fatal error:", err);
    return NextResponse.json({ received: true });
  }
}
