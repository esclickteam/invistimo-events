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
   מדרגות מחיר – זהה ל-PricingPage (plan3 לדוגמה)
============================================================ */
const PLAN3_RATES: [number, number][] = [
  [50, 3.75],
  [100, 3.22],
  [150, 2.98],
  [200, 2.76],
  [250, 2.65],
  [300, 2.52],
  [350, 2.43],
  [400, 2.35],
  [450, 2.28],
  [500, 2.21],
  [550, 2.14],
  [600, 2.07],
  [650, 2.06],
  [700, 2.05],
  [750, 2.04],
  [800, 2.03],
];

function getRate(records: number) {
  for (const [limit, rate] of PLAN3_RATES) {
    if (records <= limit) return rate;
  }
  return PLAN3_RATES[PLAN3_RATES.length - 1][1];
}

function calculateFullPrice(records: number) {
  return Math.round(records * getRate(records));
}

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
    const { records } = await req.json();

    if (!records || records <= 0) {
      return NextResponse.json(
        { error: "Invalid records value" },
        { status: 400 }
      );
    }

    /* ===============================
       💰 חישוב מחיר מלא
    =============================== */
    const fullPrice = calculateFullPrice(records);

    const alreadyPaid = user.paidAmount ?? 0;

    const amountToPay = Math.max(fullPrice - alreadyPaid, 0);

    if (amountToPay <= 0) {
      return NextResponse.json(
        { error: "No payment required" },
        { status: 400 }
      );
    }

    /* ===============================
       💳 STRIPE CHECKOUT
    =============================== */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,

      metadata: {
        type: "upgrade",
        userId: user._id.toString(),
        targetRecords: String(records),
        fullPrice: String(fullPrice),
        alreadyPaid: String(alreadyPaid),
        amountCharged: String(amountToPay),
      },

      line_items: [
        {
          price_data: {
            currency: "ils",
            unit_amount: amountToPay * 100,
            product_data: {
              name: `שדרוג חבילה (עד ${records} רשומות)`,
              description: `מחיר מלא ${fullPrice}₪ · שולם ${alreadyPaid}₪`,
            },
          },
          quantity: 1,
        },
      ],

      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/seating?upgraded=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/seating`,
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
