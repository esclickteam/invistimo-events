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

function normalizeAllowedMessageRounds(value: any): 2 | 3 {
  return Number(value) === 3 ? 3 : 2;
}

/* =========================================================
   POST – STRIPE CHECKOUT (ADMIN)
========================================================= */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id?: string; userId?: string }> }
) {
  try {
    await connectDB();

    /* ===== AUTH ===== */
    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    if (!isAdminContext(auth)) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    /* ===== PARAMS ===== */
    const params = await context.params;
    const userId = params.id || params.userId;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_USER_ID",
        },
        { status: 400 }
      );
    }

    /* ===== USER ===== */
    const user: any = await User.findById(userId).lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (user.hasPaid) {
      return NextResponse.json(
        {
          success: false,
          error: "ALREADY_PAID",
        },
        { status: 400 }
      );
    }

    const price = Number(user.paidAmount || 0);

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_PRICE_ON_USER",
        },
        { status: 400 }
      );
    }

    /* ===== DERIVE USER DATA FOR WEBHOOK ===== */
    const plan = String(user.plan || user.priceKey || "plan1");

    const guests = Number(
      user.guests ??
        user.maxGuests ??
        user.planLimits?.maxGuests ??
        0
    );

    /*
      ✅ חשוב:
      שומרים את הבחירה של האדמין גם ב־Stripe metadata.
      אחרת ה־webhook עלול לעדכן לפי ברירת מחדל ולהחזיר ל־2.
    */
    const allowedMessageRounds = normalizeAllowedMessageRounds(
      user.allowedMessageRounds ?? user.planLimits?.allowedMessageRounds
    );

    const includeCalls = Boolean(
      user.includeCalls || user.planLimits?.callsEnabled
    );

    const includeCreditGifts = Boolean(user.includeCreditGifts);

    const seatingEnabled = Boolean(
      user.includeDigitalSeating || user.planLimits?.seatingEnabled
    );

    const selfManageEnabled = Boolean(
      user.selfManageEnabled || user.includeEventManagement
    );

    const customDesignEnabled = Boolean(
      user.customDesignEnabled || user.includeCustomDesign
    );

    /* ===== SITE URL ===== */
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

    if (!appUrl || !/^https?:\/\//.test(appUrl)) {
      throw new Error(`INVALID NEXT_PUBLIC_SITE_URL: ${appUrl}`);
    }

    const cleanBaseUrl = appUrl.replace(/\/+$/, "");

    /* ===== STRIPE CHECKOUT SESSION ===== */
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
        source: "admin_checkout",

        userId: String(user._id),
        email: String(user.email || "").toLowerCase(),
        role: String(user.role || "user"),

        plan: String(plan),
        priceKey: String(user.priceKey || plan),
        packageName: String(user.packageName || ""),

        guests: String(guests || 0),
        maxGuests: String(guests || 0),

        /*
          ✅ זה השדה הקריטי
        */
        allowedMessageRounds: String(allowedMessageRounds),

        includeCalls: String(includeCalls),
        includeCreditGifts: String(includeCreditGifts),
        seatingEnabled: String(seatingEnabled),
        includeDigitalSeating: String(seatingEnabled),
        selfManageEnabled: String(selfManageEnabled),
        includeEventManagement: String(selfManageEnabled),
        customDesignEnabled: String(customDesignEnabled),
        includeCustomDesign: String(customDesignEnabled),
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