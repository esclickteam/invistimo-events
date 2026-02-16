import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   STRIPE
========================================================= */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

/* =========================================================
   HELPERS
========================================================= */
function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

/* =========================================================
   POST – STRIPE CHECKOUT (ADMIN)
========================================================= */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    /* ===== AUTH ===== */
    const auth = await getUserIdFromRequest(req);
    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (!isAdminContext(auth)) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    /* ===== PARAMS ===== */
    const { id: userId } = await context.params;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "MISSING_USER_ID" },
        { status: 400 }
      );
    }

    /* ===== USER ===== */
    const user: any = await User.findById(userId).lean();
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

    const price = Number(user.paidAmount || 0);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { success: false, error: "INVALID_PRICE_ON_USER" },
        { status: 400 }
      );
    }

    /* ===== derive plan data for webhook ===== */
    const plan = String(user.plan || "plan1");
    const guests = Number(user.guests ?? user.planLimits?.maxGuests ?? 0);

    const includeCalls = Boolean(
      user.includeCalls || user.planLimits?.callsEnabled
    );
    const includeCreditGifts = Boolean(user.includeCreditGifts);
    const selfManageEnabled = Boolean(user.selfManageEnabled);
    const customDesignEnabled = Boolean(user.customDesignEnabled);
    const seatingEnabled = Boolean(user.planLimits?.seatingEnabled);

    /* ===== SITE URL ===== */
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (!appUrl || !/^https?:\/\//.test(appUrl)) {
      throw new Error(`INVALID NEXT_PUBLIC_SITE_URL: ${appUrl}`);
    }

    const cleanBaseUrl = appUrl.replace(/\/+$/, "");

    /* ===== STRIPE ===== */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: String(user.email || "").toLowerCase(),
      line_items: [
        {
          price_data: {
            currency: "ils",
            product_data: {
              name: `Invistimo – ${plan}`,
              description: `Guests: ${guests || 0}`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        source: "pricing",
        userId: String(user._id),
        email: String(user.email || "").toLowerCase(),
        role: String(user.role || "user"),

        plan: String(plan),
        guests: String(guests || 0),

        includeCalls: String(includeCalls),
        includeCreditGifts: String(includeCreditGifts),
        seatingEnabled: String(seatingEnabled),
        selfManageEnabled: String(selfManageEnabled),
        customDesignEnabled: String(customDesignEnabled),
      },
      success_url: `${cleanBaseUrl}/admin/users?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cleanBaseUrl}/admin/users?canceled=1`,
    });

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
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
