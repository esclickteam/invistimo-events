import { NextResponse } from "next/server";
import Stripe from "stripe";
import { entitlementFor, readStudioAuth } from "@/lib/invitationStudio/access";
import { studioCheckoutGate } from "@/lib/invitationStudio/entitlement";
import { readStudioSettings } from "@/lib/invitationStudio/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await readStudioAuth(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const entitlement = entitlementFor(session.user);
  if (entitlement.entitled) {
    return NextResponse.json({
      success: true,
      alreadyEntitled: true,
      checkout: null,
      reason: entitlement.reason,
    });
  }

  const gate = studioCheckoutGate(process.env.STRIPE_SECRET_KEY);
  if (!gate.ok) {
    return NextResponse.json(
      {
        success: false,
        error: gate.reason === "live_blocked" ? "LIVE_CHARGE_BLOCKED" : "CHECKOUT_UNAVAILABLE",
        message:
          gate.reason === "live_blocked"
            ? "חיוב אמיתי חסום עד לאישור. לא נפתחה סליקה."
            : "רכישה עצמאית תיפתח רק עם מפתח בדיקה של הסליקה. לא בוצע חיוב.",
      },
      { status: 409 }
    );
  }

  const settings = await readStudioSettings();
  const origin = new URL(req.url).origin;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-11-17.clover",
  });
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: session.user.email || undefined,
    success_url: `${origin}/dashboard/invitation-studio?paid=1`,
    cancel_url: `${origin}/dashboard/invitation-studio?paid=0`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "ils",
          unit_amount: settings.priceIls * 100,
          product_data: { name: "הזמנה דיגיטלית מעוצבת" },
        },
      },
    ],
    metadata: {
      source: "invitation_studio",
      userId: String(session.user._id),
      priceIls: String(settings.priceIls),
    },
  });

  return NextResponse.json({
    success: true,
    alreadyEntitled: false,
    url: checkout.url,
    granted: false,
  });
}
