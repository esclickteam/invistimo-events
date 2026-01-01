import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* ============================================================
   Stripe instance
============================================================ */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/* ============================================================
   Packages (fixed prices)
============================================================ */
const PRICE_CONFIG: Record<
  string,
  { priceId: string; maxGuests: number; plan: "basic" | "premium" }
> = {
  basic_plan_49: {
    priceId: "price_1SdWP9LCgfc20iubG9OFDPVs",
    maxGuests: 100,
    plan: "basic",
  },
  premium_100_v2: {
    priceId: "price_1SdSGkLCgfc20iubDzINSFfW",
    maxGuests: 100,
    plan: "premium",
  },
  premium_200_v2: {
    priceId: "price_1SfPbsLCgfc20iubw1ZSq3hE",
    maxGuests: 200,
    plan: "premium",
  },
  premium_300: {
    priceId: "price_1SfPaoLCgfc20iubiRBsT6NF",
    maxGuests: 300,
    plan: "premium",
  },
  premium_400: {
    priceId: "price_1SfPeALCgfc20iubmO93vP6z",
    maxGuests: 400,
    plan: "premium",
  },
  premium_500: {
    priceId: "price_1SfPgNLCgfc20iubN2pcgF6T",
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
   Add-ons
============================================================ */
const ADDON_CONFIG: Record<string, { lookupKey: string; messages: number }> = {
  extra_messages_500: { lookupKey: "extra_messages_500", messages: 500 },
};

/* ============================================================
   Premium & Calls price maps (₪)
============================================================ */
const PREMIUM_PRICE_MAP: Record<number, number> = {
  100: 149,
  200: 239,
  300: 299,
  400: 379,
  500: 429,
  600: 489,
  700: 539,
  800: 599,
  1000: 699,
};

const CALLS_ADDON_MAP: Record<number, number> = {
  100: 100,
  200: 200,
  300: 300,
  400: 400,
  500: 500,
  600: 600,
  700: 700,
  800: 800,
  1000: 1000,
};

/* ============================================================
   Helpers
============================================================ */
const ALLOWED_GUEST_LEVELS = [100, 200, 300, 400, 500, 600, 700, 800, 1000];
function safeGuestLevel(n: any) {
  const num = Number(n);
  return ALLOWED_GUEST_LEVELS.includes(num) ? num : 100;
}

/* ============================================================
   POST handler
============================================================ */
export async function POST(req: Request) {
  try {
    const { priceKey, email, invitationId, includeCalls = false } =
      await req.json();

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
       CASE 1: Add-on (messages)
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
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/payment/cancel`,
        metadata: {
          invitationId: invitationId || "",
          priceKey,
          type: "addon",
          messages: String(addon.messages),
        },
      });
      return NextResponse.json({ url: session.url });
    }

    /* ============================================================
       CASE 2: Package purchase (Premium + Optional Calls)
    ============================================================ */
    const config = PRICE_CONFIG[priceKey];
    if (!config) {
      return NextResponse.json(
        { error: `Invalid priceKey: ${priceKey}` },
        { status: 400 }
      );
    }

    if (config.plan === "basic") {
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
          includeCalls: "false",
          type: "package",
        },
      });
      return NextResponse.json({ url: session.url });
    }

    // ✅ PREMIUM
    const level = safeGuestLevel(config.maxGuests);
    const basePrice = PREMIUM_PRICE_MAP[level];
    const addonPrice = includeCalls ? CALLS_ADDON_MAP[level] : 0;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "ils",
          product_data: {
            name: `Invistimo Premium (עד ${level} אורחים)`,
          },
          unit_amount: Math.round(basePrice * 100),
        },
        quantity: 1,
      },
    ];

    if (includeCalls && addonPrice > 0) {
      lineItems.push({
        price_data: {
          currency: "ils",
          product_data: {
            name: "שירות אישורי הגעה טלפוניים (3 סבבים)",
          },
          unit_amount: Math.round(addonPrice * 100),
        },
        quantity: 1,
      });
    }

    const totalPaid = basePrice + addonPrice;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: lineItems,
      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel`,
      metadata: {
        invitationId: invitationId || "",
        priceKey,
        plan: config.plan,
        maxGuests: String(level),
        includeCalls: includeCalls ? "true" : "false",
        callsAddonPrice: String(addonPrice),
        totalPaid: String(totalPaid),
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
