import { NextResponse, NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/* =========================================================
   STRIPE
========================================================= */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
});

/* =========================================================
   AUTH – ADMIN ONLY
========================================================= */
async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  if (!token) {
    return { error: "UNAUTHORIZED", status: 401 };
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { role?: string };

    if (decoded.role !== "admin") {
      return { error: "FORBIDDEN", status: 403 };
    }

    return { decoded };
  } catch {
    return { error: "UNAUTHORIZED", status: 401 };
  }
}

/* =========================================================
   POST – CREATE STRIPE CHECKOUT FOR USER
========================================================= */
export async function POST(
  req: NextRequest,
  context: any // 🔥 עקיפה בטוחה לבאג ה-typed routes של Next
) {
  try {
    await connectDB();

    /* ---------- AUTH ---------- */
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    /* ---------- PARAMS ---------- */
    const userId = context.params?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "MISSING_USER_ID" },
        { status: 400 }
      );
    }

    /* ---------- BODY ---------- */
    const body = await req.json();
    const { price, description } = body ?? {};

    if (!price || Number(price) <= 0) {
      return NextResponse.json(
        { success: false, error: "INVALID_PRICE" },
        { status: 400 }
      );
    }

    /* ---------- USER ---------- */
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ---------- APP URL (FIX) ---------- */
    const appUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      "https://invistimo.com"; // fallback בטוח

    /* ---------- STRIPE CHECKOUT ---------- */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,

      line_items: [
        {
          price_data: {
            currency: "ils",
            product_data: {
              name: "שירות מערכת",
              description:
                description ?? `תשלום עבור משתמש ${user.email}`,
            },
            unit_amount: Math.round(Number(price) * 100), // אגורות
          },
          quantity: 1,
        },
      ],

      metadata: {
        userId: String(user._id),
        role: user.role,
      },

      success_url: `${appUrl}/admin/users?paid=1`,
      cancel_url: `${appUrl}/admin/users?canceled=1`,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (err) {
    console.error("STRIPE CHECKOUT ERROR:", err);
    return NextResponse.json(
      { success: false, error: "CHECKOUT_FAILED" },
      { status: 500 }
    );
  }
}
