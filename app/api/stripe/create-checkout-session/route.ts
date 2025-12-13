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
   Add-ons config (NO priceId)
============================================================ */
const ADDON_CONFIG: Record<
  string,
  { lookupKey: string; messages: number }
> = {
  extra_messages_500: {
    lookupKey: "extra_messages_500",
    messages: 500,
  },
};

export async function POST(req: Request) {
  try {
    const { priceKey, quantity = 1 } = await req.json();

    if (!priceKey || !ADDON_CONFIG[priceKey]) {
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

    const addon = ADDON_CONFIG[priceKey];

    /* ============================================================
       Fetch price by lookup_key
    ============================================================ */
    const prices = await stripe.prices.list({
      lookup_keys: [addon.lookupKey],
      limit: 1,
    });

    const price = prices.data[0];
    if (!price) {
      return NextResponse.json(
        { error: "Price not found for lookup_key" },
        { status: 400 }
      );
    }

    /* ============================================================
       Create Checkout Session
    ============================================================ */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      line_items: [
        {
          price: price.id,
          quantity,
        },
      ],

      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/messages`,

      metadata: {
        type: "addon",
        priceKey,
        messages: String(addon.messages * quantity),
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
