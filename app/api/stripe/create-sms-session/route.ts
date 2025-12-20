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
   SMS Add-ons config (lookup_key בלבד)
   ⚠️ חייב להתאים בדיוק ל-Stripe
============================================================ */
const SMS_ADDON_CONFIG: Record<
  string,
  { lookupKey: string; messages: number }
> = {
  extra_messages_500: { lookupKey: "extra_messages_500", messages: 500 },
  extra_messages_750: { lookupKey: "extra_messages_750", messages: 750 },
  extra_messages_1000: { lookupKey: "extra_messages_1000", messages: 1000 },
  extra_messages_1250: { lookupKey: "extra_messages_1250", messages: 1250 },
  extra_messages_1500: { lookupKey: "extra_messages_1500", messages: 1500 },

};

/* ============================================================
   Create SMS Checkout Session
============================================================ */
export async function POST(req: Request) {
  try {
    const { priceKey, quantity = 1 } = await req.json();

    if (!priceKey || !SMS_ADDON_CONFIG[priceKey]) {
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

    const addon = SMS_ADDON_CONFIG[priceKey];

    /* ============================================================
       Fetch price by lookup_key from Stripe
    ============================================================ */
    const prices = await stripe.prices.list({
      lookup_keys: [addon.lookupKey],
      limit: 1,
    });

    const price = prices.data[0];
    if (!price) {
      return NextResponse.json(
        { error: `Price not found for ${addon.lookupKey}` },
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

      success_url: `${baseUrl}/dashboard/messages?success=true`,
      cancel_url: `${baseUrl}/dashboard/messages?canceled=true`,

      metadata: {
        type: "addon",
        priceKey,
        messages: String(addon.messages * quantity),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("❌ Stripe create-sms-session error:", err);
    return NextResponse.json(
      { error: "Failed to create SMS checkout session" },
      { status: 500 }
    );
  }
}
