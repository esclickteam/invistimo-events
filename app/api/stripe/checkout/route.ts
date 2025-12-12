import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// 🔑 מיפוי חבילות → priceId מ-Stripe
const PRICE_MAP: Record<string, string> = {
  basic: "price_1SdUFcLCgfc20iubYcT0FMCu",           // 49₪
  premium_100: "price_1SdSGkLCgfc20iubDzINSFfW",  // 149₪
  premium_300: "price_1SdSpILCgfc20iub7y1HQUeR",  // 249₪
  premium_500: "price_1SdSpyLCgfc20iubdw9J8fjq",  // 399₪
  premium_1000: "price_1SdSqULCgfc20iubjawJsU7h" // 699₪
};

export async function POST(req: Request) {
  try {
    const { priceKey, email } = await req.json();

    // 🛑 הגנה – חבילה לא קיימת
    const priceId = PRICE_MAP[priceKey];
    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid price key" },
        { status: 400 }
      );
    }

    // 💳 יצירת Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment", // חד־פעמי
      customer_email: email,

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

       

      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/cancel`,
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
