import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* ============================================================
   Stripe instance
   ✅ בלי apiVersion
============================================================ */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/* ============================================================
   Packages (fixed prices)
============================================================ */
const PRICE_CONFIG: Record<
  string,
  { priceId: string; maxGuests: number; plan: "basic" | "premium" }
> = {
  // ✅ תומך בשני המפתחות כדי שלא תתקעי
  basic_plan: {
    priceId: "price_1SdWP9LCgfc20iubG9OFDPVs",
    maxGuests: 100,
    plan: "basic",
  },
 
  premium_100_v2: {
   priceId: "price_1SdSGkLCgfc20iubDzINSFfW",
    maxGuests: 100,
    plan: "premium",
  },

  premium_200: {
    priceId: "price_1SfT32LCgfc20iubjKfjv3ZQ", 
    maxGuests: 200,
    plan: "premium",
  },

  premium_300: {
    priceId: "price_1SdSpILCgfc20iub7y1HQUeR",
    maxGuests: 300,
    plan: "premium",
  },

  premium_400: {
    priceId: "price_1SfPeALCgfc20iubmO93vP6z",
    maxGuests: 400,
    plan: "premium",
  },

  premium_500: {
    priceId: "price_1SdvFcLCgfc20iub0Pg9c2Su",
    maxGuests: 500,
    plan: "premium",
  },

  premium_600: {
    priceId: "price_1SfPhlLCgfc20iubcsRvxp3H",
    maxGuests: 600,
    plan: "premium",
  },

  premium_700: {
    priceId: "price_1SfPijLCgfc20iubU3bGUyHc",
    maxGuests: 700,
    plan: "premium",
  },

  premium_800: {
    priceId: "price_1SfPjNLCgfc20iub4OuAyn1Y",
    maxGuests: 800,
    plan: "premium",
  },

  premium_1000: {
    priceId: "price_1SdSqULCgfc20iubjawJsU7h",
    maxGuests: 1000,
    plan: "premium",
  },
};

/* ============================================================
   One-off Add-ons (lookup_key based)
============================================================ */
const ADDON_CONFIG: Record<string, { lookupKey: string; messages: number }> = {
  extra_messages_500: {
    lookupKey: "extra_messages_500",
    messages: 500,
  },
};

export async function POST(req: Request) {
  try {
    const { priceKey, email, invitationId, quantity = 1 } = await req.json();

    // ✅ priceKey + email חובה כדי שלא יהיה checkout אנונימי
    if (!priceKey || !email) {
      return NextResponse.json(
        { error: "Missing priceKey or email" },
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
       CASE 1: Add-on
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
        line_items: [{ price: price.id, quantity }],

        success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/payment/cancel`,

        metadata: {
          invitationId: invitationId || "",
          priceKey,
          type: "addon",
          messages: String(addon.messages * Number(quantity || 1)),
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
        { error: `Invalid priceKey: ${priceKey}` },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [{ price: config.priceId, quantity: 1 }],

      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel`,

      metadata: {
        invitationId: invitationId || "",
        priceKey,
        plan: config.plan,
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
