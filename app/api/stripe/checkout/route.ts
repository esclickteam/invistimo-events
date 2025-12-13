import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* ============================================================
   Stripe instance — MUST match dashboard API version
============================================================ */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

/* ============================================================
   Price config:
   priceKey → { priceId, maxGuests }
============================================================ */
const PRICE_CONFIG: Record<
  string,
  { priceId: string; maxGuests: number }
> = {
  basic_plan_49: {
    priceId: "price_1SdWP9LCgfc20iubG9OFDPVs",
    maxGuests: 100, // בסיסי
  },

  premium_100: {
    priceId: "price_1SdSGkLCgfc20iubDzINSFfW",
    maxGuests: 100,
  },

  premium_300: {
    priceId: "price_1SdSpILCgfc20iub7y1HQUeR",
    maxGuests: 300,
  },

  premium_500: {
    priceId: "price_1SdSpyLCgfc20iubdw9J8fjq",
    maxGuests: 500,
  },

  premium_1000: {
    priceId: "price_1SdSqULCgfc20iubjawJsU7h",
    maxGuests: 1000,
  },
};

export async function POST(req: Request) {
  try {
    const { priceKey, email, invitationId } = await req.json();

    if (!priceKey || !email || !invitationId) {
      return NextResponse.json(
        { error: "Missing priceKey, email or invitationId" },
        { status: 400 }
      );
    }

    const config = PRICE_CONFIG[priceKey];
    if (!config) {
      return NextResponse.json(
        { error: "Invalid priceKey" },
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

    /* ============================================================
       Create Checkout Session
    ============================================================ */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,

      line_items: [
        {
          price: config.priceId,
          quantity: 1,
        },
      ],

      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel`,

      /* 🔑 קריטי: metadata ל־Webhook */
      metadata: {
        invitationId,
        priceKey,
        maxGuests: String(config.maxGuests),
        packageType: "sms",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
