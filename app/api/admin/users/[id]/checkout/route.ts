import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   ENV VALIDATION
========================================================= */
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}
if (!process.env.JWT_SECRET) {
  throw new Error("Missing JWT_SECRET");
}
if (!process.env.NEXT_PUBLIC_SITE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SITE_URL");
}

/* =========================================================
   STRIPE
========================================================= */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
});

/* =========================================================
   AUTH – ADMIN ONLY
========================================================= */
async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  if (!token) {
    return { error: "UNAUTHORIZED", status: 401 as const };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      role?: string;
      userId?: string;
      id?: string;
      _id?: string;
      email?: string;
    };

    if (decoded.role !== "admin") {
      return { error: "FORBIDDEN", status: 403 as const };
    }

    return { decoded };
  } catch {
    return { error: "UNAUTHORIZED", status: 401 as const };
  }
}

/* =========================================================
   HELPERS
========================================================= */
function normalizeHttpsUrl(raw?: string): string {
  const value = String(raw || "").trim();
  if (!value || !value.startsWith("https://")) {
    throw new Error(`INVALID NEXT_PUBLIC_SITE_URL: ${value}`);
  }
  return value.replace(/\/+$/, "");
}

function resolveParams(
  params: { id: string } | Promise<{ id: string }>
): Promise<{ id: string }> {
  return Promise.resolve(params);
}

/* =========================================================
   POST – STRIPE CHECKOUT (ADMIN)
========================================================= */
export async function POST(
  req: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    await connectDB();

    /* ===== AUTH ===== */
    const auth = await requireAdmin();
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    /* ===== PARAMS ===== */
    const { id: userId } = await resolveParams(context.params);

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

    /**
     * חשוב:
     * כרגע המחיר נלקח מ-paidAmount לפי הלוגיקה הקיימת אצלך.
     * אם paidAmount אצל משתמש חדש הוא 0, צריך שדה אחר למחיר (למשל priceToPay).
     */
    const price = Number(user.paidAmount ?? 0);

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { success: false, error: "INVALID_PRICE_ON_USER" },
        { status: 400 }
      );
    }

    const appUrl = normalizeHttpsUrl(process.env.NEXT_PUBLIC_SITE_URL);

    /* ===== STRIPE CHECKOUT ===== */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: String(user.email || "").toLowerCase(),

      line_items: [
        {
          price_data: {
            currency: "ils",
            product_data: {
              name: "תשלום מערכת",
              description: `תשלום עבור ${user.name || user.email || "user"}`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],

      metadata: {
        userId: String(user._id),
        email: String(user.email || "").toLowerCase(),
        role: String(user.role || ""),
        source: "pricing", // אחיד עם ה-webhook
        flow: "admin_create_user",
      },

      success_url: `${appUrl}/admin/users?paid=1`,
      cancel_url: `${appUrl}/admin/users?canceled=1`,
    });

    if (!session.url) {
      return NextResponse.json(
        { success: false, error: "CHECKOUT_URL_MISSING" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
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
