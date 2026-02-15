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
   מחיר שדרוג לפי חבילה בלבד
============================================================ */
function getUpgradePrice(plan: string | undefined) {
  if (plan === "plan1") return 100;
  if (plan === "plan2") return 80;
  return 0; // plan3 או אחר – כבר כולל הושבה
}

/* ============================================================
   HANDLER
============================================================ */
export async function POST() {
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
       💰 חישוב מחיר לפי חבילה
    =============================== */
    const amountToPay = getUpgradePrice(user.plan);

    if (amountToPay <= 0) {
      return NextResponse.json(
        { error: "Upgrade not required" },
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
        type: "seating-upgrade",
        userId: user._id.toString(),
        currentPlan: user.plan ?? "",
        amountCharged: String(amountToPay),
      },

      line_items: [
        {
          price_data: {
            currency: "ils",
            unit_amount: amountToPay * 100,
            product_data: {
              name: "שדרוג להושבה דיגיטלית",
              description:
                user.plan === "plan1"
                  ? "שדרוג מחבילת קל להזמין"
                  : "שדרוג מחבילת מזמינים חכם",
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
