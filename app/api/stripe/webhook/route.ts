import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createEventOnce } from "@/lib/createEventOnce";


export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// 🔑 מיפוי priceId → כמות אורחים
const GUEST_LIMIT_BY_PRICE: Record<string, number> = {
  price_1SdQxWLCgfc20iubqaxqB5Ka: 50,
  price_1SdR0KLCgfc20iub6VaEuose: 100,
  price_1SdR1ULCgfc20iubCb1yi3wI: 300,
  price_1SdR2ELCgfc20iubkvBev5gQ: 500,
  price_1SdR2sLCgfc20iub64gEzODZ: 1000,
};

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Invalid webhook signature", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;

    if (!priceId || !GUEST_LIMIT_BY_PRICE[priceId]) {
      console.error("❌ Unknown priceId:", priceId);
      return NextResponse.json({ error: "Unknown price" }, { status: 400 });
    }

    await createEventOnce({
      email: session.customer_email!,
      maxGuests: GUEST_LIMIT_BY_PRICE[priceId],
      stripeSessionId: session.id,
    });
  }

  return NextResponse.json({ received: true });
}
