import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import User from "@/models/User";
import WeddingChallengeEntitlement from "@/models/WeddingChallengeEntitlement";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
  WEDDING_CHALLENGES_PRICE_ILS,
} from "@/lib/weddingChallenges/constants";
import { applyWeddingChallengesPurchase } from "@/lib/weddingChallenges/purchase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAdmin(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    Boolean(auth?.impersonatedBy)
  );
}

export async function GET() {
  const auth = await getUserIdFromRequest();
  if (!auth?.userId || !isAdmin(auth)) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  await db();
  const rows = await WeddingChallengeEntitlement.find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return NextResponse.json({ success: true, sales: rows });
}

export async function POST(req: NextRequest) {
  const auth = await getUserIdFromRequest();
  if (!auth?.userId || !isAdmin(auth)) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  await db();
  const body = await req.json().catch(() => ({}));
  const name = String(body.customerName || body.name || "").trim();
  const phone = String(body.phone || body.customerPhone || "").trim();
  const email = String(body.email || body.customerEmail || "").trim().toLowerCase();
  const includeGiveaway = body.includeGiveaway === true;
  const paymentRaw = String(body.paymentStatus || "").toLowerCase();
  const paymentStatus =
    paymentRaw === "paid" ? "paid" : paymentRaw === "unpaid" ? "unpaid" : "pending";
  const paymentMethod = String(body.paymentMethod || "manual").trim();
  const notes = String(body.notes || "").trim();
  const prizeCost = Number(body.prizeCost || 0) || 0;
  const sourceType =
    body.sourceType === "EXISTING_EVENT" ? "EXISTING_EVENT" : "STANDALONE_GAME";
  const eventId = String(body.eventId || "").trim() || null;

  if (!name || !phone) {
    return NextResponse.json(
      { success: false, error: "NAME_PHONE_REQUIRED" },
      { status: 400 }
    );
  }

  let user =
    (email ? await User.findOne({ email }) : null) ||
    (await User.findOne({ phone }));

  if (!user) {
    user = await User.create({
      name,
      phone,
      email: email || undefined,
      role: "user",
      isActive: paymentStatus === "paid",
      hasPaid: paymentStatus === "paid",
      hasDashboardAccess: paymentStatus === "paid",
      includeDigitalSeating: false,
      weddingChallengesOnly: sourceType !== "EXISTING_EVENT",
      accessModules: {
        rsvpSeating: sourceType === "EXISTING_EVENT",
        weddingChallenges: paymentStatus === "paid",
        eventProduction: false,
      },
    });
  }

  const paid = paymentStatus === "paid";
  const entitlement = await applyWeddingChallengesPurchase({
    userId: String(user._id),
    eventId,
    sourceType,
    includeGiveaway,
    pricePaid:
      WEDDING_CHALLENGES_PRICE_ILS +
      (includeGiveaway ? WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS : 0),
    paymentMethod,
    paymentStatus,
    status: paid ? "ACTIVE" : paymentStatus === "unpaid" ? "CANCELLED" : "PENDING",
    notes,
    prizeCost,
    customerName: name,
    customerPhone: phone,
    customerEmail: email,
  });

  return NextResponse.json({
    success: true,
    userId: String(user._id),
    entitlement,
    setupPath: "/dashboard/wedding-challenges",
    message: paid
      ? "הזכאות הופעלה. הלקוח יכול להשלים את הגדרת Wedding Challenges."
      : "המכירה נשמרה. הזכאות תופעל אחרי תשלום.",
  });
}
