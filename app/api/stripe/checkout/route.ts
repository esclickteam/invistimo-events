import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* ============================================================
   Stripe instance — match your dashboard API version
============================================================ */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

/* ============================================================
   lookup_key (priceKey) → Stripe priceId
============================================================ */
const PRICE_MAP: Record<string, string> = {
  basic_plan: "price_1SdVK5LCgfc20iubLwRTHMKT", // 49₪
  premium_100: "price_1SdSGkLCgfc20iubDzINSFfW", // 149₪
  premium_300: "price_1SdSpILCgfc20iub7y1HQUeR", // 249₪
  premium_500: "price_1SdSpyLCgfc20iubdw9J8fjq", // 399₪
  premium_1000: "price_1SdSqULCgfc20iubjawJsU7h", // 699₪
};

export async function POST(req: Request) {
  try {
    const { priceKey, email } = (await req.json()) as {
      priceKey?: string;
      email?: string;
    };

    if (!priceKey || !email) {
      return NextResponse.json(
        { error: "Missing priceKey or email" },
        { status: 400 }
      );
    }

    const priceId = PRICE_MAP[priceKey];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid price key" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SITE_URL" },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,

      line_items: [{ price: priceId, quantity: 1 }],

      // ✅ אחרי תשלום: חוזרים לדשבורד (כולל session_id למעקב/דיבאג)
      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel`,

      metadata: { priceKey },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
