import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: Request) {
  try {
    const { count, price } = await req.json();

    if (!count || !price)
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "ils",
            product_data: {
              name: `רכישת ${count} הודעות SMS`,
            },
            unit_amount: price * 100, // בשקלים -> אגורות
          },
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/messages?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/messages?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("❌ Stripe error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
