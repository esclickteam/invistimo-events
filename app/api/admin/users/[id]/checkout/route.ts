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

  console.log("[ADMIN] authToken exists:", Boolean(token));

  if (!token) {
    return { error: "UNAUTHORIZED", status: 401 };
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { role?: string };

    console.log("[ADMIN] decoded role:", decoded.role);

    if (decoded.role !== "admin") {
      return { error: "FORBIDDEN", status: 403 };
    }

    return { decoded };
  } catch (err) {
    console.error("[ADMIN] JWT verify failed:", err);
    return { error: "UNAUTHORIZED", status: 401 };
  }
}

/* =========================================================
   POST – CREATE STRIPE CHECKOUT FOR USER
========================================================= */
export async function POST(
  req: NextRequest,
  context: any
) {
  try {
    console.log("========== STRIPE CHECKOUT START ==========");

    await connectDB();
    console.log("[DB] connected");

    /* ---------- AUTH ---------- */
    const auth = await requireAdmin();
    if ("error" in auth) {
      console.warn("[AUTH] failed:", auth.error);
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    /* ---------- PARAMS ---------- */
    const userId = context.params?.id;
    console.log("[PARAM] userId:", userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "MISSING_USER_ID" },
        { status: 400 }
      );
    }

    /* ---------- BODY ---------- */
    const body = await req.json();
    const { price, description } = body ?? {};

    console.log("[BODY] price:", price, "description:", description);

    if (!price || Number(price) <= 0) {
      return NextResponse.json(
        { success: false, error: "INVALID_PRICE" },
        { status: 400 }
      );
    }

    /* ---------- USER ---------- */
    const user = await User.findById(userId).lean();
    console.log("[USER] found:", Boolean(user), "email:", user?.email);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    /* ---------- APP URL (CRITICAL) ---------- */
    const rawAppUrl = process.env.NEXT_PUBLIC_SITE_URL;

    console.log(
      "[ENV] NEXT_PUBLIC_SITE_URL (raw):",
      JSON.stringify(rawAppUrl)
    );

    if (!rawAppUrl) {
      throw new Error("NEXT_PUBLIC_SITE_URL is missing");
    }

    const appUrl = rawAppUrl.trim();

    console.log(
      "[ENV] NEXT_PUBLIC_SITE_URL (trimmed):",
      JSON.stringify(appUrl)
    );

    if (!appUrl.startsWith("https://")) {
      throw new Error(
        `NEXT_PUBLIC_SITE_URL must start with https:// (got: ${appUrl})`
      );
    }

    const successUrl = `${appUrl}/admin/users?paid=1`;
    const cancelUrl = `${appUrl}/admin/users?canceled=1`;

    console.log("[STRIPE] success_url:", successUrl);
    console.log("[STRIPE] cancel_url:", cancelUrl);

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
            unit_amount: Math.round(Number(price) * 100),
          },
          quantity: 1,
        },
      ],

      metadata: {
        userId: String(user._id),
        role: user.role,
      },

      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    console.log("[STRIPE] session created:", session.id);

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (err) {
    console.error("❌ STRIPE CHECKOUT ERROR:", err);

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
