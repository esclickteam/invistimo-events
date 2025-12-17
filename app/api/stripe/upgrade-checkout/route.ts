import Stripe from "stripe";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// 💡 מחיר חבילת בסיס
const BASE_PRICE = 49;

// ⭐ מחירון פרימיום – מקור אמת
const PREMIUM_PRICES: Record<number, number> = {
  100: 149,
  200: 239,
  300: 299,
  400: 379,
  500: 429,
  600: 489,
  700: 539,
  800: 599,
  1000: 699,
};

export async function POST(req: Request) {
  try {
    await connectDB();

    /* ===============================
       🔐 אימות משתמש (Next 15/16)
    =============================== */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as { userId: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    /* ===============================
       📦 בקשת שדרוג
    =============================== */
    const { guests } = await req.json();

    const fullPrice = PREMIUM_PRICES[guests];
    if (!fullPrice) {
      return NextResponse.json(
        { error: "Invalid package" },
        { status: 400 }
      );
    }

    // ✅ חישוב הפרש מהבסיס
    const amountToPay = Math.max(fullPrice - BASE_PRICE, 0);

    if (amountToPay === 0) {
      return NextResponse.json(
        { error: "No payment required" },
        { status: 400 }
      );
    }

    /* ===============================
       💳 Stripe Checkout
    =============================== */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,

      metadata: {
        type: "upgrade",
        userId: user._id.toString(),
        basePrice: String(BASE_PRICE),
        targetGuests: String(guests),
        fullPrice: String(fullPrice),
        amountCharged: String(amountToPay),
      },

      line_items: [
        {
          price_data: {
            currency: "ils",
            unit_amount: amountToPay * 100,
            product_data: {
              name: `שדרוג ל־Premium (עד ${guests} אורחים)`,
              description: `כבר שולם ${BASE_PRICE}₪ · תשלום הפרש`,
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
    console.error("❌ Upgrade checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create upgrade checkout" },
      { status: 500 }
    );
  }
}
