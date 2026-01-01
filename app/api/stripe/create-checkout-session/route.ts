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
   One-off Add-ons (lookup_key based)
============================================================ */
const ADDON_CONFIG: Record<string, { lookupKey: string; messages: number }> = {
  extra_messages_500: {
    lookupKey: "extra_messages_500",
    messages: 500,
  },
};

/* ============================================================
   Premium base prices (₪) by guest level
   ✅ חייב להיות "מקור אמת" בשרת כדי למנוע זיופים מהקליינט
============================================================ */
const PREMIUM_BASE_PRICE_MAP: Record<number, number> = {
  100: 99,
  200: 149,
  300: 199,
  400: 249,
  500: 299,
  600: 349,
  700: 399,
  800: 449,
  1000: 499,
};

/* ============================================================
   Helpers
============================================================ */
const ALLOWED_GUEST_LEVELS = [100, 200, 300, 400, 500, 600, 700, 800, 1000];

function safeGuestLevel(n: any) {
  const num = Number(n);
  return ALLOWED_GUEST_LEVELS.includes(num) ? num : 100;
}

export async function POST(req: Request) {
  try {
    const {
      priceKey,
      email,
      invitationId,
      quantity = 1,

      // ✅ מגיע מהקליינט (בדף register)
      includeCalls,
      // אפשר להגיע גם guests אם תרצי, אבל אנחנו ניקח את maxGuests מה-config
      // guests,
    } = await req.json();

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
       CASE 1: Add-on (messages וכו')
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
       ✅ כאן אנחנו מוסיפים את תוספת השיחות בתוך אותה עסקה
============================================================ */
    const config = PRICE_CONFIG[priceKey];
    if (!config) {
      return NextResponse.json(
        { error: `Invalid priceKey: ${priceKey}` },
        { status: 400 }
      );
    }

    const wantCalls = Boolean(includeCalls);

    // ✅ מחשבים לפי השרת:
    // - basic: נשאר עם priceId קבוע
    // - premium: אנחנו *לא* סומכים על מחיר מהקליינט לתוספת,
    //           אלא יוצרים line_items ידני לפי base + addon
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
          callsAddonPrice: "0",
          totalPaid: "49",
          type: "package",
        },
      });

      return NextResponse.json({ url: session.url });
    }

    // ✅ PREMIUM flow:
    const level = safeGuestLevel(config.maxGuests);

    const basePrice = PREMIUM_BASE_PRICE_MAP[level] ?? PREMIUM_BASE_PRICE_MAP[100];
    const addonPrice = wantCalls ? level * 1 : 0; // ✅ 1₪ לכל אורח
    const totalPaid = basePrice + addonPrice;

    // ✅ יוצרים line_items בצורה דינמית כדי לשלב base + addon באותה עסקה
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "ils",
          product_data: {
            name: `Invistimo Premium (עד ${level} אורחים)`,
          },
          unit_amount: Math.round(basePrice * 100), // אגורות
        },
        quantity: 1,
      },
    ];

    if (wantCalls && addonPrice > 0) {
      lineItems.push({
        price_data: {
          currency: "ils",
          product_data: {
            name: `שירות אישורי הגעה טלפוניים (3 סבבים)`,
          },
          unit_amount: Math.round(addonPrice * 100), // אגורות
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: lineItems,

      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel`,

      metadata: {
        invitationId: invitationId || "",
        priceKey,
        plan: "premium",
        maxGuests: String(level),
        includeCalls: wantCalls ? "true" : "false",
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
