import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   Stripe instance
============================================================ */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

type PlanKey = "basic" | "premium" | "plan1" | "plan2" | "plan3";

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").toLowerCase().trim();
  return s === "true" || s === "1" || s === "yes";
}

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePlan(raw: unknown): PlanKey {
  const p = String(raw ?? "").trim().toLowerCase();
  if (p === "plan1" || p === "plan2" || p === "plan3" || p === "premium" || p === "basic") {
    return p;
  }
  return "basic";
}

/* ============================================================
   POST handler – PRICE + FULL METADATA + DEBUG LOGS
============================================================ */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const amountNum = toNum(body?.amount);
    const email = String(body?.email || "").trim().toLowerCase();
    const userId = String(body?.userId || "").trim();

    // ✅ שדות שה-webhook צריך
    const plan = normalizePlan(body?.plan);
    const guests = toNum(body?.guests, 0);

    const seatingEnabled = toBool(body?.seatingEnabled);
    const includeCalls = toBool(body?.includeCalls);
    const callsAddonPrice = toNum(body?.callsAddonPrice, 0);

    const includeCreditGifts = toBool(body?.includeCreditGifts);
    const creditGiftsAddonPrice = toNum(body?.creditGiftsAddonPrice, 0);

    // אופציונלי
    const smsPerRecord = toNum(body?.smsPerRecord, 0);
    const maxMessages = toNum(body?.maxMessages, 0);

    // ===== DEBUG: payload נכנס =====
    console.log("🟦 [create-checkout] incoming body:", {
      amountRaw: body?.amount,
      amountNum,
      email,
      userId,
      plan,
      guests,
      seatingEnabled,
      includeCalls,
      callsAddonPrice,
      includeCreditGifts,
      creditGiftsAddonPrice,
      smsPerRecord,
      maxMessages,
    });

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      console.error("🟥 [create-checkout] invalid amount:", {
        amountRaw: body?.amount,
        amountNum,
      });
      return NextResponse.json(
        { error: "Missing or invalid amount" },
        { status: 400 }
      );
    }

    if (!email) {
      console.error("🟥 [create-checkout] missing email");
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    if (!userId) {
      console.error("🟥 [create-checkout] missing userId");
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (!Number.isFinite(guests) || guests <= 0) {
      console.error("🟥 [create-checkout] invalid guests:", {
        guestsRaw: body?.guests,
        guests,
      });
      return NextResponse.json(
        { error: "Missing or invalid guests" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!baseUrl) {
      console.error("🟥 [create-checkout] missing NEXT_PUBLIC_SITE_URL");
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SITE_URL" },
        { status: 500 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("🟥 [create-checkout] missing STRIPE_SECRET_KEY");
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const cleanBaseUrl = baseUrl.replace(/\/+$/, "");

    // ===== DEBUG: metadata שתישלח לסטרייפ =====
    const metadata = {
      // identity
      userId,
      email,

      // pricing core
      amount: String(amountNum),
      source: "pricing",
      flow: "pricing_checkout",

      // package fields
      plan: String(plan),
      guests: String(guests),

      seatingEnabled: String(seatingEnabled),
      includeCalls: String(includeCalls),
      callsAddonPrice: String(callsAddonPrice),

      includeCreditGifts: String(includeCreditGifts),
      creditGiftsAddonPrice: String(creditGiftsAddonPrice),

      // optional quotas
      smsPerRecord: String(smsPerRecord),
      maxMessages: String(maxMessages),
    };

    console.log("🟨 [create-checkout] metadata to stripe:", metadata);

    /* ============================================================
       Stripe Checkout
    ============================================================ */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "ils",
            product_data: {
              name: "Invistimo – הרשמה",
              description: `Plan: ${plan} | Guests: ${guests}`,
            },
            unit_amount: Math.round(amountNum * 100), // ₪ -> אגורות
          },
          quantity: 1,
        },
      ],

      success_url: `${cleanBaseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cleanBaseUrl}/payment/cancel`,
      metadata,
    });

    if (!session.url) {
      console.error("🟥 [create-checkout] session created without url:", {
        sessionId: session.id,
      });
      return NextResponse.json(
        { error: "Failed to create checkout URL" },
        { status: 500 }
      );
    }

    // ===== DEBUG: session שנוצר =====
    console.log("🟩 [create-checkout] session created:", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      livemode: session.livemode,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_email,
      metadata: session.metadata,
      url: session.url,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (err: any) {
    console.error("❌ [create-checkout] Stripe checkout error:", {
      message: err?.message,
      type: err?.type,
      code: err?.code,
      raw: err,
    });

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
