import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { sendPasswordSetupMail } from "@/lib/sendPasswordSetupMail";
import Event from "@/models/Event";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   Helpers
========================================================= */
function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

function buildUsersFilter(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // all | active
  const scope = (searchParams.get("scope") || "all").toLowerCase();
  const q = (searchParams.get("q") || "").trim();

  const baseFilter: any = {
    isDemoUser: { $ne: true },
  };

  const activeFilter: any = {
    ...baseFilter,
    $or: [
      { hasPaid: true },
      { plan: "premium" },
      { createdByProducer: { $ne: null } },
      { role: "producer" },
      { role: "staff" },
    ],
  };

  const filter: any = scope === "active" ? activeFilter : baseFilter;

  if (q) {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    });
  }

  return { filter, scope, q };
}

/* =========================================================
   GET – ADMIN USERS LIST
   /api/admin/users?scope=all|active&q=...
========================================================= */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

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

    const { filter, scope, q } = buildUsersFilter(req);

    const users = await User.find(filter)
      .select(`
        name
        email
        role
        staffType
        plan
        guests
        maxMessages
        paidAmount
        hasPaid
        includeCalls
        includeCreditGifts
        createdByProducer
        producerId
        planLimits
        smsUsed
        createdAt
        producerPricePerRecord
        assignedProducerId
        assignedStaffIds
      `)
      .sort({ createdAt: -1 })
      .lean();

    const userIds = users.map((u: any) => u._id);

    const events =
      userIds.length > 0
        ? await Event.find({ userId: { $in: userIds } })
            .select("userId date")
            .sort({ date: -1 })
            .lean()
        : [];

    const revenueAgg = await User.aggregate([
      {
        $match: {
          isDemoUser: { $ne: true },
          hasPaid: true,
          paidAmount: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ["$paidAmount", 0] } },
        },
      },
    ]);

    const totalRevenue = revenueAgg[0]?.totalRevenue ?? 0;

    const eventByUserId = new Map<string, any>();
    for (const event of events) {
      const uid = String(event.userId);
      if (!eventByUserId.has(uid)) {
        eventByUserId.set(uid, event);
      }
    }

    const usersWithEventDate = users.map((u: any) => {
      const event = eventByUserId.get(String(u._id));
      return {
        ...u,
        eventDate: event?.date || null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        users: usersWithEventDate,
        totalRevenue,
        meta: {
          scope, // all / active
          q,
          count: usersWithEventDate.length,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("❌ ADMIN USERS GET ERROR:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST – CREATE USER (ADMIN)
========================================================= */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

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

    const body = await req.json().catch(() => null);
    const { name, email, role, limits, billing, addons, plan } = body || {};



    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, error: "MISSING_REQUIRED_FIELDS" },
        { status: 400 }
      );
    }

    // מניעת כפילות מייל
    const existing = await User.findOne({ email: String(email).toLowerCase() })
      .select("_id")
      .lean();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "EMAIL_ALREADY_EXISTS" },
        { status: 409 }
      );
    }

    /* ================= PRODUCER ================= */
    if (role === "producer") {
      const pricePerRecord = Number(billing?.pricePerRecord || 0);

      const user = await User.create({
        name,
        email: String(email).toLowerCase(),
        role: "producer",

        producerPricePerRecord: pricePerRecord,

        hasPaid: true,
        paidAmount: 0,

        needsPasswordSetup: true,
        createdByAdmin: true,
        billingSource: "admin",
      });

      await sendPasswordSetupMail(String(user._id));

      return NextResponse.json(
        { success: true, userId: String(user._id) },
        { status: 201 }
      );
    }

    /* ================= STAFF ================= */
    if (role === "staff") {
      const user = await User.create({
        name,
        email: String(email).toLowerCase(),
        role: "staff",

        hasPaid: false,
        paidAmount: 0,

        needsPasswordSetup: true,
        createdByAdmin: true,
        billingSource: "admin",
      });

      await sendPasswordSetupMail(String(user._id));

      return NextResponse.json(
        { success: true, userId: String(user._id) },
        { status: 201 }
      );
    }

    /* ================= USER ================= */
    const { records, smsTotal, includeCalls } = limits || {};
    const { price, paymentStatus } = billing || {};

    const recordsNum = Number(records);
const smsTotalNum = Number(smsTotal);
const priceNum = Number(price ?? 0);

if (
  Number.isNaN(recordsNum) ||
  Number.isNaN(smsTotalNum) ||
  Number.isNaN(priceNum)
) {
  return NextResponse.json(
    { success: false, error: "INVALID_LIMITS_OR_BILLING" },
    { status: 400 }
  );
}


    const finalIncludeCalls = !!includeCalls;

const finalIncludeCreditGifts =
  plan === "plan3" ||
  addons?.credit?.enabled === true;



    const planLimits = {
      maxGuests: recordsNum,
      smsEnabled: true,
      smsLimit: smsTotalNum,
      seatingEnabled: true,
      remindersEnabled: true,
      callsEnabled: finalIncludeCalls,
    };

    const user = await User.create({
      name,
      email: String(email).toLowerCase(),
      role: "user",

      plan: plan || "premium",

      planLimits,

      guests: recordsNum,
      maxMessages: smsTotalNum,

      includeCalls: finalIncludeCalls,
includeCreditGifts: finalIncludeCreditGifts,
creditGiftsAddonPrice: addons?.credit?.price || 0,


      hasPaid: paymentStatus === "paid",
      paidAmount: priceNum,

      needsPasswordSetup: true,
      createdByAdmin: true,
      billingSource: "admin",
    });

    if (paymentStatus === "paid") {
      await Payment.create({
        email: String(email).toLowerCase(),

        stripeSessionId: null,
        stripePaymentIntentId: null,
        stripeCustomerId: null,
        stripePriceId: null,

        priceKey: `admin_manual_${recordsNum}`,
        maxGuests: recordsNum,

        includeCalls: finalIncludeCalls,
        callsAddonPrice: 0,

        includeCreditGifts: finalIncludeCreditGifts,
creditGiftsAddonPrice: addons?.credit?.price || 0,


        amount: priceNum,
        refundAmount: 0,
        currency: "ils",

        type: "package",
        status: "paid",
        isTest: false,

        metadata: {
          source: "admin",
          adminId: auth.impersonatedBy
            ? String(auth.impersonatedBy)
            : String(auth.userId),
          userId: String(user._id),
        },
      });
    }

    await sendPasswordSetupMail(String(user._id));

    return NextResponse.json(
      { success: true, userId: String(user._id) },
      { status: 201 }
    );
  } catch (err) {
    console.error("🔥 ADMIN USERS POST ERROR:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
