import Stripe from "stripe";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// מחירון מקור אמת
const PREMIUM_PRICES: Record<number, number> = {
  100: 149,
  300: 249,
  500: 399,
  1000: 699,
};

export async function POST(req: Request) {
  try {
    await connectDB();

    // 🔐 אימות משתמש
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { userId: string };

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { guests } = await req.json();

    const fullPrice = PREMIUM_PRICES[guests];
    if (!fullPrice) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }

    const alreadyPaid = user.paidAmount || 0;
    const amountToPay = fullPrice - alreadyPaid;

    if (amountToPay <= 0) {
      return NextResponse.json(
        { error: "No payment required" },
        { status: 400 }
      );
    }

    // 💳 Checkout דינמי להפרש בלבד
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,

      metadata: {
        type: "upgrade",
        targetGuests: String(guests),
        fullPrice: String(fullPrice),
        previousPaid: String(alreadyPaid),
      },

      line_items: [
        {
          price_data: {
            currency: "ils",
            unit_amount: amountToPay * 100,
            product_data: {
              name: `שדרוג ל-Premium (${guests} אורחים)`,
            },
          },
          quantity: 1,
        },
      ],

      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/upgrade/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/upgrade/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Upgrade checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create upgrade checkout" },
      { status: 500 }
    );
  }
}
