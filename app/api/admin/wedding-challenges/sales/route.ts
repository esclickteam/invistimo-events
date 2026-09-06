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
import { sendPasswordSetupMail } from "@/lib/sendPasswordSetupMail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAdmin(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    Boolean(auth?.impersonatedBy)
  );
}

function money(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function serializeSale(row: any, user?: any) {
  const userId = String(row.userId?._id || row.userId || "");
  return {
    _id: String(row._id),
    userId,
    customerName: row.customerName || user?.name || "",
    phone: row.customerPhone || user?.phone || "",
    email: row.customerEmail || user?.email || "",
    sourceType: row.sourceType,
    status: row.status,
    paymentStatus: row.paymentStatus,
    paymentMethod: row.paymentMethod || "",
    pricePaid: Number(row.pricePaid || 0),
    giveawayPurchased: Boolean(row.giveawayPurchased),
    giveawayFee: Number(row.giveawayFee || 0),
    prizeCost: Number(row.prizeCost || 0),
    eventId: row.eventId ? String(row.eventId) : null,
    notes: row.notes || "",
    createdAt: row.createdAt,
    user: user
      ? {
          _id: String(user._id),
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
        }
      : userId
        ? { _id: userId, name: "", email: "", phone: "" }
        : null,
  };
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
  const userIds = rows.map((row: any) => row.userId).filter(Boolean);
  const users = await User.find({ _id: { $in: userIds } })
    .select("name email phone")
    .lean();
  const byId = new Map(users.map((user: any) => [String(user._id), user]));
  return NextResponse.json({
    success: true,
    sales: rows.map((row: any) => serializeSale(row, byId.get(String(row.userId)))),
  });
}

export async function POST(req: NextRequest) {
  const auth = await getUserIdFromRequest();
  if (!auth?.userId || !isAdmin(auth)) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  await db();
  const body = await req.json().catch(() => ({}));

  if (body.action === "password_setup") {
    const userId = String(body.userId || "").trim();
    if (!userId) {
      return NextResponse.json({ success: false, error: "USER_ID_REQUIRED" }, { status: 400 });
    }
    const passwordSetup = await sendPasswordSetupMail(userId);
    return NextResponse.json({ success: true, passwordSetup });
  }

  const name = String(body.customerName || body.name || "").trim();
  const phone = String(body.phone || body.customerPhone || "").trim();
  const email = String(body.email || body.customerEmail || "").trim().toLowerCase();
  const includeGiveaway = body.includeGiveaway === true;
  const paymentRaw = String(body.paymentStatus || "").toLowerCase();
  const paymentStatus =
    paymentRaw === "paid" ? "paid" : paymentRaw === "unpaid" ? "unpaid" : "pending";
  const paymentMethod = String(body.paymentMethod || "manual").trim();
  const notes = String(body.notes || "").trim();
  const prizeCost = money(body.prizeCost, 0);
  const basePrice = money(body.price, WEDDING_CHALLENGES_PRICE_ILS) || WEDDING_CHALLENGES_PRICE_ILS;
  const giveawayPrice =
    money(body.giveawayPrice, WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS) ||
    WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS;
  const sourceType =
    body.sourceType === "EXISTING_EVENT" ? "EXISTING_EVENT" : "STANDALONE_GAME";
  const eventId = String(body.eventId || "").trim() || null;

  if (!name || !phone) {
    return NextResponse.json(
      { success: false, error: "NAME_PHONE_REQUIRED" },
      { status: 400 }
    );
  }

  if (!email) {
    return NextResponse.json(
      { success: false, error: "EMAIL_REQUIRED", message: "חובה למלא אימייל כדי ליצור משתמש" },
      { status: 400 }
    );
  }

  let user =
    (await User.findOne({ email })) ||
    (await User.findOne({ phone }));

  let createdUser = false;
  if (!user) {
    user = await User.create({
      name,
      phone,
      email,
      role: "user",
      isActive: paymentStatus === "paid",
      hasPaid: paymentStatus === "paid",
      hasDashboardAccess: paymentStatus === "paid",
      needsPasswordSetup: true,
      includeDigitalSeating: false,
      weddingChallengesOnly: sourceType !== "EXISTING_EVENT",
      accessModules: {
        rsvpSeating: sourceType === "EXISTING_EVENT",
        weddingChallenges: paymentStatus === "paid",
        eventProduction: false,
      },
    });
    createdUser = true;
  } else {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          name: name || user.name,
          phone: phone || user.phone,
          email: email || user.email,
        },
      }
    );
  }

  const paid = paymentStatus === "paid";
  const entitlement = await applyWeddingChallengesPurchase({
    userId: String(user._id),
    eventId,
    sourceType,
    includeGiveaway,
    basePrice,
    giveawayPrice,
    pricePaid: basePrice + (includeGiveaway ? giveawayPrice : 0),
    paymentMethod,
    paymentStatus,
    status: paid ? "ACTIVE" : paymentStatus === "unpaid" ? "CANCELLED" : "PENDING",
    notes,
    prizeCost,
    customerName: name,
    customerPhone: phone,
    customerEmail: email,
  });

  let passwordSetup = null;
  if (createdUser || user.needsPasswordSetup) {
    try {
      passwordSetup = await sendPasswordSetupMail(String(user._id));
    } catch (err) {
      console.error("WC admin password setup failed:", err);
    }
  }

  return NextResponse.json({
    success: true,
    createdUser,
    userId: String(user._id),
    entitlement: serializeSale(entitlement, user),
    setupPath: "/dashboard/wedding-challenges",
    passwordSetup: passwordSetup
      ? {
          link: passwordSetup.link,
          email: passwordSetup.email,
          phone: passwordSetup.phone,
          smsSent: passwordSetup.smsSent,
          smsError: passwordSetup.smsError || null,
        }
      : null,
    message: createdUser
      ? "המשתמש נוצר והמכירה נשמרה. אפשר לשלוח לו את לינק הסיסמה ולהיכנס לניהול."
      : paid
        ? "הזכאות הופעלה על המשתמש הקיים."
        : "המכירה נשמרה על המשתמש הקיים. הזכאות תופעל אחרי תשלום.",
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await getUserIdFromRequest();
  if (!auth?.userId || !isAdmin(auth)) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  await db();
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || body.entitlementId || "").trim();
  if (!id) {
    return NextResponse.json({ success: false, error: "SALE_ID_REQUIRED" }, { status: 400 });
  }

  const set: Record<string, unknown> = {};
  if (body.pricePaid != null) set.pricePaid = money(body.pricePaid, 0);
  if (body.giveawayFee != null) set.giveawayFee = money(body.giveawayFee, 0);
  if (body.prizeCost != null) set.prizeCost = money(body.prizeCost, 0);
  if (body.notes != null) set.notes = String(body.notes || "");
  if (body.paymentStatus) {
    const paymentRaw = String(body.paymentStatus).toLowerCase();
    const paymentStatus =
      paymentRaw === "paid" ? "paid" : paymentRaw === "unpaid" ? "unpaid" : "pending";
    set.paymentStatus = paymentStatus;
    set.status = paymentStatus === "paid" ? "ACTIVE" : paymentStatus === "unpaid" ? "CANCELLED" : "PENDING";
  }

  const row = await WeddingChallengeEntitlement.findByIdAndUpdate(id, { $set: set }, { new: true });
  if (!row) {
    return NextResponse.json({ success: false, error: "SALE_NOT_FOUND" }, { status: 404 });
  }

  if (set.pricePaid != null || set.giveawayFee != null) {
    const giveaway = Boolean(row.giveawayPurchased);
    const giveawayFee = Number(row.giveawayFee || 0);
    const total = Number(row.pricePaid || 0);
    const basePrice = Math.max(0, total - (giveaway ? giveawayFee : 0));
    await User.findByIdAndUpdate(row.userId, {
      $set: {
        "salesUpsells.weddingChallenges.price": basePrice || WEDDING_CHALLENGES_PRICE_ILS,
        "salesUpsells.weddingChallengesGiveaway.price": giveawayFee || WEDDING_CHALLENGES_GIVEAWAY_PRICE_ILS,
      },
    });
  }

  return NextResponse.json({ success: true, sale: serializeSale(row) });
}
