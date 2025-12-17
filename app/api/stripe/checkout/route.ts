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
   Subscription / Packages (fixed prices)
============================================================ */
const PRICE_CONFIG: Record<
  string,
  { priceId: string; maxGuests: number }
> = {
  basic_plan_49: {
    priceId: "price_1SdWP9LCgfc20iubG9OFDPVs",
    maxGuests: 100,
  },

  premium_100: {
    priceId: "price_1SdSGkLCgfc20iubDzINSFfW",
    maxGuests: 100,
  },

  premium_200: {
    priceId: "price_1SdSGkLCgfc20iubDzINSFfW",
    maxGuests: 200,
  },
  

  premium_300: {
    priceId: "price_1SdSpILCgfc20iub7y1HQUeR",
    maxGuests: 300,
  },

  premium_400: {
    priceId: "price_1SfPeALCgfc20iubmO93vP6z",
    maxGuests: 400,
  },

  premium_500: {
    priceId: "price_1SdvFcLCgfc20iub0Pg9c2Su",
    maxGuests: 500,
  },

  premium_600: {
    priceId: "price_1SfPhlLCgfc20iubcsRvxp3H",
    maxGuests: 600,
  },

  premium_700: {
    priceId: "price_1SfPijLCgfc20iubU3bGUyHc",
    maxGuests: 700,
  },

  premium_800: {
    priceId: "price_1SfPjNLCgfc20iub4OuAyn1Y",
    maxGuests: 800,
  },


  premium_1000: {
    priceId: "price_1SdSqULCgfc20iubjawJsU7h",
    maxGuests: 1000,
  },
};

/* ============================================================
   One-off Add-ons (lookup_key based)
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
    const { priceKey, email, invitationId, quantity = 1 } = await req.json();

    if (!priceKey || !email || !invitationId) {
      return NextResponse.json(
        { error: "Missing priceKey, email or invitationId" },
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
       CASE 1: Add-on (500 הודעות נוספות)
    ============================================================ */
    if (ADDON_CONFIG[priceKey]) {
      const addon = ADDON_CONFIG[priceKey];

      const prices = await stripe.prices.list({
        lookup_keys: [addon.lookupKey],
        expand: ["data.product"],
      });

      const price = prices.data[0];
      if (!price) {
        return NextResponse.json(
          { error: "Price not found for add-on" },
          { status: 400 }
        );
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: email,

        line_items: [
          {
            price: price.id,
            quantity,
          },
        ],

        success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/payment/cancel`,

        metadata: {
          invitationId,
          priceKey,
          type: "addon",
          messages: String(addon.messages * quantity),
        },
      });

      return NextResponse.json({ url: session.url });
    }

    /* ============================================================
       CASE 2: Package purchase
    ============================================================ */
    const config = PRICE_CONFIG[priceKey];
    if (!config) {
      return NextResponse.json(
        { error: "Invalid priceKey" },
        { status: 400 }
      );
    }

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

      metadata: {
        invitationId,
        priceKey,
        maxGuests: String(config.maxGuests),
        type: "package",
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
