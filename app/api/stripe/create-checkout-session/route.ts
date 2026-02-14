import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/* ============================================================
   Stripe instance
============================================================ */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
});

/* ============================================================
   POST handler – PRICE ONLY
============================================================ */
export async function POST(req: Request) {
  try {
    const { amount, email, userId } = await req.json();

    if (!amount || amount <= 0 || !email) {
      return NextResponse.json(
        { error: "Missing or invalid amount/email" },
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
            },
            unit_amount: Math.round(amount * 100), // ₪ → אגורות
          },
          quantity: 1,
        },
      ],

      success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel`,

      metadata: {
        userId: userId || "",
        amount: String(amount),
        source: "pricing",
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
