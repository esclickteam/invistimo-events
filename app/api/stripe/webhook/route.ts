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

function normalizeAllowedMessageRounds(value: unknown): 2 | 3 {
  return Number(value) === 3 ? 3 : 2;
}

/* =========================================================
   PLAN AUTHORITY
============================================================ */

function getPlanDefaults(plan: string, guests: number, allowedMessageRounds: 2 | 3) {
  switch (plan) {
    case "plan1":
      return {
        planLimits: {
          maxGuests: guests,

          /*
            ✅ חשוב:
            לא דורסים יותר את סבבי ההודעות.
            הערך מגיע מהבחירה של האדמין / metadata / המשתמש.
          */
          allowedMessageRounds,

          smsEnabled: true,
          smsLimit: 0,

          remindersEnabled: true,
          seatingEnabled: false,
          callsEnabled: false,
        },
        includeCalls: false,
        includeCreditGifts: false,
      };

    case "plan2":
      return {
        planLimits: {
          maxGuests: guests,

          /*
            ✅ לפי מה שנבחר לאדמין
          */
          allowedMessageRounds,

          smsEnabled: true,
          smsLimit: 0,

          remindersEnabled: true,
          seatingEnabled: false,
          callsEnabled: true,
        },
        includeCalls: true,
        includeCreditGifts: false,
      };

    case "plan3":
      return {
        planLimits: {
          maxGuests: guests,

          /*
            ✅ גם בחבילה 3 לא מכריחים 3.
            אם האדמין בחר 2 — יישמר 2.
            אם האדמין בחר 3 — יישמר 3.
          */
          allowedMessageRounds,

          smsEnabled: true,
          smsLimit: 0,

          remindersEnabled: true,
          seatingEnabled: true,
          callsEnabled: true,
        },
        includeCalls: true,
        includeCreditGifts: true,
      };

    default:
      return {
        planLimits: {
          maxGuests: guests,
          allowedMessageRounds,

          smsEnabled: false,
          smsLimit: 0,

          remindersEnabled: false,
          seatingEnabled: false,
          callsEnabled: false,
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
        console.log("ℹ️ Admin upgrade payment already exists:", paymentIntentId);
        return NextResponse.json({ received: true });
      }

      const plan = String(session.metadata?.plan || "");
      const priceKey = String(session.metadata?.priceKey || plan);
      const packageName = String(session.metadata?.packageName || "");

      const guests = toNum(session.metadata?.guests, 0);
      const maxGuests = toNum(session.metadata?.maxGuests, guests);

      const smsLimit = toNum(session.metadata?.smsLimit, 0);
      const maxMessages = toNum(session.metadata?.maxMessages, smsLimit);

      /*
        ✅ חדש:
        גם בשדרוג אדמין שומרים את סבבי ההודעות.
        קודם metadata, ואם אין — הערך הקיים על המשתמש.
      */
      const allowedMessageRounds = normalizeAllowedMessageRounds(
        session.metadata?.allowedMessageRounds ??
          user.allowedMessageRounds ??
          user.planLimits?.allowedMessageRounds
      );

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

          allowedMessageRounds,

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

            /*
              ✅ חשוב:
              שדה ישיר על המשתמש
            */
            allowedMessageRounds,

            includeCalls,
            includeCreditGifts,
            includeDigitalSeating,
            includeEventManagement,
            includeCustomDesign,

            selfManageEnabled: includeEventManagement,
            customDesignEnabled: includeCustomDesign,

            "planLimits.maxGuests": maxGuests,

            /*
              ✅ חשוב:
              גם בתוך planLimits
            */
            "planLimits.allowedMessageRounds": allowedMessageRounds,

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
          details: `plan=${plan} | guests=${maxGuests} | rounds=${allowedMessageRounds} | extraRecords=${extraRecords}`,
        });
      } catch (err) {
        console.error("❌ Failed to notify admin about upgrade", err);
      }

      console.log("✅ Admin upgrade completed for user:", String(user._id));

      return NextResponse.json({ received: true });
    }

    /* =========================================================
       HANDLE PRICING / ADMIN CHECKOUT
    ============================================================ */

    const source = String(session.metadata?.source || "");

    /*
      ✅ תומך גם בקוד הישן שלך שהיה source: pricing
      וגם בקוד החדש מהאדמין ששלחנו קודם source: admin_checkout
    */
    if (source !== "pricing" && source !== "admin_checkout") {
      return NextResponse.json({ received: true });
    }

    const paymentIntentId = String(session.payment_intent);
    const amount = toNum(session.amount_total, 0) / 100;

    const plan = String(session.metadata?.plan || user.plan || "plan1");

    const priceKey = String(
      session.metadata?.priceKey || user.priceKey || plan
    );

    const packageName = String(
      session.metadata?.packageName || user.packageName || ""
    );

    const guests = toNum(
      session.metadata?.guests,
      toNum(user.guests ?? user.planLimits?.maxGuests, 0)
    );

    const maxGuests = toNum(
      session.metadata?.maxGuests,
      toNum(user.maxGuests ?? user.planLimits?.maxGuests, guests)
    );

    /*
      ✅ זה התיקון הקריטי:
      קודם לוקחים את מה שהגיע מ־Stripe metadata.
      אם אין — לוקחים את מה שכבר נשמר למשתמש ביצירת המשתמש.
      רק אם אין כלום — חוזרים ל־2.
    */
    const allowedMessageRounds = normalizeAllowedMessageRounds(
      session.metadata?.allowedMessageRounds ??
        user.allowedMessageRounds ??
        user.planLimits?.allowedMessageRounds
    );

    const addonSeating =
      toBool(session.metadata?.seatingEnabled) ||
      toBool(session.metadata?.includeDigitalSeating);

    const addonCalls = toBool(session.metadata?.includeCalls);

    const addonCredit = toBool(session.metadata?.includeCreditGifts);

    const addonSelfManage =
      toBool(session.metadata?.selfManageEnabled) ||
      toBool(session.metadata?.includeEventManagement);

    const addonCustomDesign =
      toBool(session.metadata?.customDesignEnabled) ||
      toBool(session.metadata?.includeCustomDesign);

    const base = getPlanDefaults(plan, maxGuests || guests, allowedMessageRounds);

    const finalIncludeCalls = base.includeCalls || addonCalls;
    const finalIncludeCreditGifts = base.includeCreditGifts || addonCredit;
    const finalSeatingEnabled = base.planLimits.seatingEnabled || addonSeating;

    const finalPlanLimits = {
      ...base.planLimits,

      maxGuests: maxGuests || guests,

      /*
        ✅ לא לתת לזה להיעלם בזמן דריסה של planLimits
      */
      allowedMessageRounds,

      seatingEnabled: finalSeatingEnabled,
      callsEnabled: finalIncludeCalls,
      remindersEnabled: true,

      /*
        נשארים לתאימות עם קוד ישן
      */
      smsEnabled: true,
      smsLimit: 0,
    };

    /* =========================================================
       PAYMENT IDEMPOTENCY
    ============================================================ */

    const existingPayment = await Payment.findOne({
      stripePaymentIntentId: paymentIntentId,
    }).lean();

    if (!existingPayment) {
      await Payment.create({
        email: (user.email || "").toLowerCase(),

        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: (session.customer as string) || "",

        priceKey,
        maxGuests: maxGuests || guests,

        includeCalls: finalIncludeCalls,
        callsAddonPrice: 0,

        includeCreditGifts: finalIncludeCreditGifts,
        creditGiftsAddonPrice: 0,

        amount,
        refundAmount: 0,
        currency: (session.currency || "ils").toLowerCase(),

        status: "paid",
        type: "package",
        isTest: !session.livemode,

        meta: {
          source,
          stripeEventId: stripeEvent.id,

          userId: String(user._id),

          plan,
          priceKey,
          packageName,

          guests,
          maxGuests: maxGuests || guests,

          /*
            ✅ חשוב לשמירה בדוחות
          */
          allowedMessageRounds,

          includeCalls: finalIncludeCalls,
          includeCreditGifts: finalIncludeCreditGifts,
          seatingEnabled: finalSeatingEnabled,
          selfManageEnabled: addonSelfManage,
          customDesignEnabled: addonCustomDesign,
        },
      });
    } else {
      console.log("ℹ️ Payment already exists for paymentIntent:", paymentIntentId);
    }

    /*
      ✅ שימי לב:
      קודם היה פה skip אם user.hasPaid === true.
      זה מסוכן במקרה שלך, כי המשתמש יכול להיווצר לפני התשלום עם נתונים חלקיים.
      לכן עכשיו אנחנו עדיין מעדכנים את השדות החשובים בצורה בטוחה.
    */
    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          hasPaid: true,
          paidAmount: amount,

          billingSource: source === "admin_checkout" ? "admin" : "site",

          isTrial: false,
          hasDashboardAccess: true,

          /*
            שמרתי כמו שהיה אצלך:
            אם אצלך לקוח ששילם צריך להיות פעיל מיד — תשני ל־true.
          */
          isActive: source === "admin_checkout" ? true : false,

          plan,
          priceKey,
          packageName,

          guests: maxGuests || guests,
          maxGuests: maxGuests || guests,

          /*
            ✅ שדה ישיר על המשתמש
          */
          allowedMessageRounds,

          /*
            ✅ שומר את כל planLimits בלי למחוק allowedMessageRounds
          */
          planLimits: finalPlanLimits,

          maxMessages: 0,
          smsLimit: 0,

          includeCalls: finalIncludeCalls,
          includeCreditGifts: finalIncludeCreditGifts,
          includeDigitalSeating: finalSeatingEnabled,
          includeEventManagement: addonSelfManage,
          includeCustomDesign: addonCustomDesign,

          selfManageEnabled: addonSelfManage,
          customDesignEnabled: addonCustomDesign,

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
        type: source === "admin_checkout" ? "Admin checkout" : "New registration",
        details: `plan=${plan} | guests=${maxGuests || guests} | rounds=${allowedMessageRounds}`,
      });
    } catch (err) {
      console.error("❌ Failed to notify admin", err);
    }

    console.log("✅ Stripe payment completed:", {
      userId: String(user._id),
      source,
      plan,
      guests: maxGuests || guests,
      allowedMessageRounds,
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("🔥 Stripe webhook fatal error:", err);
    return NextResponse.json({ received: true });
  }
}