import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

/* ============================================================
   Stripe instance
============================================================ */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

/* ============================================================
   Packages config – תשלום ראשון
============================================================ */
const PACKAGE_CONFIG: Record<
  string,
  { priceId: string }
> = {
  basic_plan_49: {
    priceId: "price_1SdWP9LCgfc20iubG9OFDPVs",
  },

  premium_100: {
    priceId: "price_1SdSGkLCgfc20iubDzINSFfW",
  },

  premium_300: {
    priceId: "price_1SdSpILCgfc20iub7y1HQUeR",
  },

  premium_500: {
    priceId: "price_1SdSpyLCgfc20iubdw9J8fjq",
  },

  premium_1000: {
    priceId: "price_1SdSqULCgfc20iubjawJsU7h",
  },
};

export async function POST(req: Request) {
  try {
    const { priceKey } = await req.json();

    if (!priceKey || !PACKAGE_CONFIG[priceKey]) {
      return NextResponse.json(
        { error: "Missing or invalid priceKey" },
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

    const pkg = PACKAGE_CONFIG[priceKey];

    /* ============================================================
       Create Checkout Session – תשלום ראשון
    ============================================================ */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      line_items: [
        {
          price: pkg.priceId,
          quantity: 1,
        },
      ],

      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/register?canceled=1`,

      metadata: {
        type: "package",
        priceKey,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe create-checkout-session error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
