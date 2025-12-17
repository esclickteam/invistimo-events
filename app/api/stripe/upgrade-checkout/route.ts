import Stripe from "stripe";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

/* ============================================================
   Stripe
============================================================ */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/* ============================================================
   🔴 FLAG לבדיקה ב-LIVE
   ❗❗ אחרי הבדיקה להחזיר ל-false ❗❗
============================================================ */
const IS_LIVE_TEST = true;

/* ============================================================
   מחירי מקור אמת
============================================================ */
const BASE_PRICE = 49;

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

/* ============================================================
   HANDLER
============================================================ */
export async function POST(req: Request) {
  try {
    await connectDB();

    /* ===============================
       🔐 AUTH
    =============================== */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as { userId: string };
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    /* ===============================
       📦 REQUEST
    =============================== */
    const { guests } = await req.json();

    const fullPrice = PREMIUM_PRICES[guests];
    if (!fullPrice) {
      return NextResponse.json(
        { error: "Invalid package" },
        { status: 400 }
      );
    }

    /* ===============================
       💰 חישוב סכומים
    =============================== */
    const realAmountToPay = Math.max(fullPrice - BASE_PRICE, 0);

    if (realAmountToPay <= 0) {
      return NextResponse.json(
        { error: "No payment required" },
        { status: 400 }
      );
    }

    // 🧪 בדיקת LIVE – גבייה של 10 ₪ בלבד
    const amountToPay = IS_LIVE_TEST ? 10 : realAmountToPay;

    /* ===============================
       💳 STRIPE CHECKOUT
    =============================== */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,

      metadata: {
        type: "upgrade",
        userId: user._id.toString(),

        targetGuests: String(guests),
        basePrice: String(BASE_PRICE),

        fullPrice: String(fullPrice),
        realAmountToPay: String(realAmountToPay),
        amountCharged: String(amountToPay),

        liveTest: IS_LIVE_TEST ? "true" : "false",
      },

      line_items: [
        {
          price_data: {
            currency: "ils",
            unit_amount: amountToPay * 100,
            product_data: {
              name: `שדרוג ל־Premium (עד ${guests} אורחים)`,
              description: IS_LIVE_TEST
                ? "בדיקת מערכת – חיוב בדיקה"
                : `כבר שולם ${BASE_PRICE}₪ · תשלום הפרש`,
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
