import Stripe from "stripe";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import db from "@/lib/db";
import User from "@/models/User";
import {
  WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
  WEDDING_CHALLENGES_PRICE_ILS,
} from "@/lib/weddingChallenges/constants";
import { applyWeddingChallengesPurchase, getActiveEntitlement } from "@/lib/weddingChallenges/purchase";
import {
  userHasWeddingChallengesEntitlement,
  userHasWeddingChallengesGiveawayEntitlement,
} from "@/lib/weddingChallenges/entitlement";
import { DEFAULT_PUBLIC_ORIGIN } from "@/lib/guestInviteUrl";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function stripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function siteOrigin() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    DEFAULT_PUBLIC_ORIGIN
  ).replace(/\/+$/, "");
}

async function currentUser() {
  const token = (await cookies()).get("authToken")?.value;
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
    return User.findById(decoded.userId);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  await db();
  const body = await req.json().catch(() => ({}));
  const includeGiveaway = body.includeGiveaway === true;
  const alreadyEntitled = userHasWeddingChallengesEntitlement(user as any);
  const alreadyGiveaway = userHasWeddingChallengesGiveawayEntitlement(user as any);

  const sourceType =
    body.sourceType === "EXISTING_EVENT" ? "EXISTING_EVENT" : "STANDALONE_GAME";
  const eventId = String(body.eventId || "").trim() || null;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  if (!alreadyEntitled) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "ils",
        unit_amount: WEDDING_CHALLENGES_PRICE_ILS * 100,
        product_data: {
          name: "Invistimo Live – Wedding Challenges",
          description: "עד 800 רשומות אורחים, עד 5 משימות לאורח, SMS פתיחה ותזמון",
        },
      },
    });
  }
  if (includeGiveaway && !alreadyGiveaway) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "ils",
        unit_amount: WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS * 100,
        product_data: {
          name: "Wedding Challenges Giveaway Add-on",
          description: "תוספת הגרלה. עלות הפרס נגבית בנפרד.",
        },
      },
    });
  }

  if (!lineItems.length) {
    return NextResponse.json({ success: false, error: "ALREADY_PURCHASED" }, { status: 400 });
  }

  const amount = lineItems.reduce((sum, item) => sum + Number(item.price_data?.unit_amount || 0), 0) / 100;
  let entitlementId = "";
  if (!alreadyEntitled) {
    const pending = await applyWeddingChallengesPurchase({
      userId: String(user._id),
      eventId,
      sourceType,
      includeGiveaway: includeGiveaway || alreadyGiveaway,
      pricePaid: amount,
      paymentMethod: "stripe",
      paymentStatus: "pending",
      status: "PENDING",
      customerName: String(user.name || user.email || ""),
      customerEmail: String(user.email || ""),
      customerPhone: String(user.phone || ""),
    });
    entitlementId = String(pending._id);
  } else {
    const existing = await getActiveEntitlement(String(user._id));
    entitlementId = existing ? String(existing._id) : "";
  }

  const session = await stripeClient().checkout.sessions.create({
    mode: "payment",
    customer_email: user.email || undefined,
    metadata: {
      type: "wedding-challenges",
      source: "wedding_challenges_checkout",
      userId: String(user._id),
      eventId: eventId || "",
      sourceType,
      includeGiveaway: includeGiveaway || alreadyGiveaway ? "true" : "false",
      entitlementId,
    },
    line_items: lineItems,
    success_url: `${siteOrigin()}/wedding-challenges/purchased`,
    cancel_url: `${siteOrigin()}/pricing?cancelled=1`,
  });

  if (entitlementId) {
    const { default: WeddingChallengeEntitlement } = await import(
      "@/models/WeddingChallengeEntitlement"
    );
    await WeddingChallengeEntitlement.updateOne(
      { _id: entitlementId },
      { $set: { stripeCheckoutSessionId: session.id } }
    );
  }

  return NextResponse.json({ success: true, url: session.url, checkoutUrl: session.url });
}
