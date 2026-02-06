import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/* =========================================================
   STRIPE
========================================================= */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
   POST – STRIPE CHECKOUT (ADMIN)
========================================================= */
export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    console.log("====== ADMIN CHECKOUT START ======");

    await connectDB();

    /* ===== AUTH ===== */
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    /* ===== PARAM ===== */
    const userId = context.params?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "MISSING_USER_ID" },
        { status: 400 }
      );
    }

    /* ===== USER ===== */
    const user = await User.findById(userId).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (user.hasPaid) {
      return NextResponse.json(
        { success: false, error: "ALREADY_PAID" },
        { status: 400 }
      );
    }

    const price = user.paidAmount;

    if (!price || price <= 0) {
      return NextResponse.json(
        { success: false, error: "INVALID_PRICE_ON_USER" },
        { status: 400 }
      );
    }

    /* ===== SITE URL ===== */
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

    if (!appUrl || !appUrl.startsWith("https://")) {
      throw new Error(
        `INVALID NEXT_PUBLIC_SITE_URL: ${appUrl}`
      );
    }

    const successUrl = `${appUrl}/admin/users?paid=1`;
    const cancelUrl = `${appUrl}/admin/users?canceled=1`;

    /* ===== STRIPE ===== */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,

      line_items: [
        {
          price_data: {
            currency: "ils",
            product_data: {
              name: "תשלום מערכת",
              description: `תשלום עבור ${user.name}`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],

      metadata: {
        userId: String(user._id),
        email: user.email,
        role: user.role,
      },

      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    console.log("✔ Stripe session:", session.id);

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (err) {
    console.error("❌ ADMIN CHECKOUT ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "CHECKOUT_FAILED",
        details:
          err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
