import Stripe from "stripe";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { notifyAdminPurchase } from "@/lib/notifyAdminPurchase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
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

/* =========================================================
   Helpers
============================================================ */

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(v: unknown): boolean {
  return String(v ?? "").toLowerCase() === "true";
}

/* =========================================================
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

/* =========================================================
   WEBHOOK
============================================================ */

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.log("❌ Missing signature");
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
      console.log("Payment status is not 'paid', exiting...");
      return NextResponse.json({ received: true });
    }

    if (!session.payment_intent) {
      console.log("No payment intent found, exiting...");
      return NextResponse.json({ received: true });
    }

    /* =========================================================
       IDENTIFY USER
    ============================================================ */

    let user: any = null;

    if (session.metadata?.userId) {
      user = await User.findById(session.metadata.userId);
    }

    if (!user && session.customer_email) {
      user = await User.findOne({
        email: String(session.customer_email).toLowerCase(),
      });
    }

    if (!user) {
      console.error("❌ User not found for payment");
      return NextResponse.json({ received: true });
    }

    /* =========================================================
   HANDLE ADMIN UPGRADE
   תשלום הפרש שדרוג מהאדמין דרך Stripe
============================================================ */

if (session.metadata?.source === "admin_upgrade") {
  const paymentIntentId = String(session.payment_intent);
  const amount = toNum(session.amount_total, 0) / 100;

  const existingUpgradePayment = await Payment.findOne({
    stripePaymentIntentId: paymentIntentId,
  }).lean();

  if (existingUpgradePayment) {
    console.log(
      "ℹ️ Admin upgrade payment already exists:",
      paymentIntentId
    );

    return NextResponse.json({ received: true });
  }

  const plan = String(session.metadata?.plan || "");
  const priceKey = String(session.metadata?.priceKey || plan);
  const packageName = String(session.metadata?.packageName || "");

  const guests = toNum(session.metadata?.guests, 0);
  const maxGuests = toNum(session.metadata?.maxGuests, guests);

  const smsLimit = toNum(session.metadata?.smsLimit, 0);
  const maxMessages = toNum(session.metadata?.maxMessages, smsLimit);

  const includeCalls = toBool(session.metadata?.includeCalls);
  const includeCreditGifts = toBool(
    session.metadata?.includeCreditGifts
  );
  const includeDigitalSeating = toBool(
    session.metadata?.includeDigitalSeating
  );
  const includeEventManagement = toBool(
    session.metadata?.includeEventManagement
  );
  const includeCustomDesign = toBool(
    session.metadata?.includeCustomDesign
  );

  const extraRecords = toNum(session.metadata?.extraRecords, 0);
  const extraRecordsAmount = toNum(
    session.metadata?.extraRecordsAmount,
    0
  );

  await Payment.create({
    email: (user.email || "").toLowerCase(),

    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    stripeCustomerId: (session.customer as string) || "",

    priceKey,
    maxGuests,

    includeCalls,
    callsAddonPrice: 0,

    includeCreditGifts,
    creditGiftsAddonPrice: 0,

    amount,
    refundAmount: 0,
    currency: (session.currency || "ils").toLowerCase(),

    type: "upgrade",
    status: "paid",
    isTest: !session.livemode,

    meta: {
      source: "admin_upgrade",
      stripeEventId: stripeEvent.id,

      userId: String(user._id),
      adminId: session.metadata?.adminId || null,

      previousPlan: session.metadata?.previousPlan || null,
      plan,
      priceKey,
      packageName,

      guests,
      maxGuests,
      smsLimit,
      maxMessages,

      includeCalls,
      includeCreditGifts,
      includeDigitalSeating,
      includeEventManagement,
      includeCustomDesign,

      extraRecords,
      extraRecordsAmount,
    },
  });

  await User.findByIdAndUpdate(
    user._id,
    {
      $inc: {
        paidAmount: amount,
      },

      $set: {
        hasPaid: true,
        isActive: true,

        plan,
        priceKey,
        packageName,

        guests: maxGuests,
        maxGuests,

        smsLimit,
        maxMessages,

        includeCalls,
        includeCreditGifts,
        includeDigitalSeating,
        includeEventManagement,
        includeCustomDesign,

        selfManageEnabled: includeEventManagement,
        customDesignEnabled: includeCustomDesign,

        "planLimits.maxGuests": maxGuests,
        "planLimits.smsEnabled": true,
        "planLimits.smsLimit": smsLimit,
        "planLimits.seatingEnabled": includeDigitalSeating,
        "planLimits.remindersEnabled": true,
        "planLimits.callsEnabled": includeCalls,

        updatedAt: new Date(),
      },
    },
    { new: true }
  );

  try {
    await notifyAdminPurchase({
      email: user.email,
      amount,
      currency: "ils",
      type: "Admin upgrade",
      details: `plan=${plan} | guests=${maxGuests} | extraRecords=${extraRecords}`,
    });
  } catch (err) {
    console.error("❌ Failed to notify admin about upgrade", err);
  }

  console.log("✅ Admin upgrade completed for user:", String(user._id));

  return NextResponse.json({ received: true });
}

    /* =========================================================
       HANDLE PRICING
    ============================================================ */

    if (session.metadata?.source !== "pricing") {
      return NextResponse.json({ received: true });
    }

    const paymentIntentId = String(session.payment_intent);
    const amount = toNum(session.amount_total, 0) / 100;

    // 1) idempotency על Payment
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
          includeCalls: session.metadata?.includeCalls ?? null,
          includeCreditGifts: session.metadata?.includeCreditGifts ?? null,
          seatingEnabled: session.metadata?.seatingEnabled ?? null,
          selfManageEnabled: session.metadata?.selfManageEnabled ?? null,
          customDesignEnabled: session.metadata?.customDesignEnabled ?? null,
        },
      });
    } else {
      console.log("ℹ️ Payment already exists for paymentIntent:", paymentIntentId);
    }

    // 2) אם כבר הופעל משתמש בעבר – לא לעדכן שוב
    if (user.hasPaid === true && Number(user.paidAmount || 0) > 0) {
      console.log("ℹ️ User already activated, skipping update.");
      return NextResponse.json({ received: true });
    }

    const plan = String(session.metadata?.plan || "plan1");
    const guests = toNum(session.metadata?.guests, 0);
    const base = getPlanDefaults(plan, guests);

    // מה שבא מהמטא-דאטה
    const addonSeating = toBool(session.metadata?.seatingEnabled);
    const addonCalls = toBool(session.metadata?.includeCalls);
    const addonCredit = toBool(session.metadata?.includeCreditGifts);
    const addonSelfManage = toBool(session.metadata?.selfManageEnabled);
    const addonCustomDesign = toBool(session.metadata?.customDesignEnabled);

    // חישוב סופי: כלול בחבילה OR נרכש כתוספת
    const finalIncludeCalls = base.includeCalls || addonCalls;
    const finalIncludeCreditGifts = base.includeCreditGifts || addonCredit;
    const finalSeatingEnabled = base.planLimits.seatingEnabled || addonSeating;

    const finalPlanLimits = {
      ...base.planLimits,
      seatingEnabled: finalSeatingEnabled,
    };

    await User.findByIdAndUpdate(
      user._id,
      {
        hasPaid: true,
        paidAmount: amount,

        // ✅ חשוב: enum חוקי במודל שלך
        billingSource: "site",

        isTrial: false,
        hasDashboardAccess: true,
        isActive: false,

        plan,
        guests,
        planLimits: finalPlanLimits,

        includeCalls: finalIncludeCalls,
        includeCreditGifts: finalIncludeCreditGifts,
        selfManageEnabled: addonSelfManage,
        customDesignEnabled: addonCustomDesign,

        updatedAt: new Date(),
      },
      { new: true }
    );

    // אין שליחת מייל כאן (בכוונה)
    // המייל נשלח רק לפני תשלום, ביצירת המשתמש

    try {
      await notifyAdminPurchase({
        email: user.email,
        amount,
        currency: "ils",
        type: "New registration",
        details: `plan=${plan} | guests=${guests}`,
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
