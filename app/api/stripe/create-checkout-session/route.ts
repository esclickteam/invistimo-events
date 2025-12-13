import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: Request) {
  try {
    const { count, price } = await req.json();

    if (!count || !price)
      return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "ils",
            unit_amount: price * 100,
            product_data: {
              name: `רכישת ${count} הודעות נוספות`,
            },
          },
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/success?count=${count}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/messages`,
    });

    return NextResponse.json({ id: session.id });
  } catch (err) {
    console.error("❌ Stripe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
