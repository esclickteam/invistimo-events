import Stripe from "stripe";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import User from "@/models/User";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PREMIUM_PRICES: Record<number, number> = {
  100: 149,
  300: 249,
  500: 399,
  1000: 699,
};

export async function POST(req: Request) {
  try {
    // ✅ cookies() הוא async
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { userId: string };

    const user = await User.findById(decoded.userId);
    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    const { guests } = await req.json();

    const fullPrice = PREMIUM_PRICES[guests];
    if (!fullPrice) {
      return new Response("Invalid package", { status: 400 });
    }

    const alreadyPaid = user.paidAmount || 0;
    const amountToPay = fullPrice - alreadyPaid;

    if (amountToPay <= 0) {
      return new Response("No payment required", { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "ils",
            unit_amount: amountToPay * 100,
            product_data: {
              name: `שדרוג ל-Premium (${guests} אורחים)`,
              description: `שולם עד כה: ₪${alreadyPaid}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/upgrade/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/upgrade/cancel`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Upgrade checkout error:", err);
    return new Response("Server error", { status: 500 });
  }
}
