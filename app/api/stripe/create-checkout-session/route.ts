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

/* ============================================================
   POST handler – PRICE ONLY + FULL METADATA
============================================================ */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const amountNum = toNum(body?.amount);
    const email = String(body?.email || "").trim().toLowerCase();
    const userId = String(body?.userId || "").trim();

    // ✅ שדות חדשים שה-webhook צריך כדי לעדכן Mongo נכון
    const plan = String(body?.plan || "basic").trim() as PlanKey;
    const guests = toNum(body?.guests, 0);

    const seatingEnabled = toBool(body?.seatingEnabled);
    const includeCalls = toBool(body?.includeCalls);
    const callsAddonPrice = toNum(body?.callsAddonPrice, 0);

    const includeCreditGifts = toBool(body?.includeCreditGifts);
    const creditGiftsAddonPrice = toNum(body?.creditGiftsAddonPrice, 0);

    // אופציונלי אם את שומרת במשתמש
    const smsPerRecord = toNum(body?.smsPerRecord, 0);
    const maxMessages = toNum(body?.maxMessages, 0);

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid amount" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // חשוב: webhook מזהה לפי userId בצורה הכי בטוחה
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (!Number.isFinite(guests) || guests <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid guests" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SITE_URL" },
        { status: 500 }
      );
    }

    const cleanBaseUrl = baseUrl.replace(/\/+$/, "");

    /* ============================================================
       Stripe Checkout – price_data דינמי
    ============================================================ */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,

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

      // מומלץ דף ביניים עד שה-webhook מסיים לעדכן Mongo
      success_url: `${cleanBaseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cleanBaseUrl}/payment/cancel`,

      metadata: {
        // identity
        userId,
        email,

        // pricing core
        amount: String(amountNum),
        source: "pricing",
        flow: "pricing_checkout",

        // package fields for webhook -> mongo update
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
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error("❌ Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
