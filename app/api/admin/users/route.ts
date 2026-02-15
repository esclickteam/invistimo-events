import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Payment from "@/models/Payment";
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

    const users = await User.find(filter).sort({ createdAt: -1 }).lean();

    const userIds = users.map((u: any) => u._id);

    const events =
      userIds.length > 0
        ? await Event.find({ userId: { $in: userIds } })
            .select("userId date")
            .sort({ date: -1 })
            .lean()
        : [];

    const eventByUserId = new Map<string, any>();
    for (const event of events) {
      const uid = String(event.userId);
      if (!eventByUserId.has(uid)) {
        eventByUserId.set(uid, event);
      }
    }

    const usersWithEventDate = users.map((u: any) => ({
      ...u,
      eventDate: eventByUserId.get(String(u._id))?.date || null,
    }));

    return NextResponse.json({
      success: true,
      users: usersWithEventDate,
      meta: {
        scope,
        q,
        count: usersWithEventDate.length,
      },
    });
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
   ❗️ לא שולח מייל סיסמה
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

    const normalizedEmail = String(email).toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail })
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
        email: normalizedEmail,
        role: "producer",

        producerPricePerRecord: pricePerRecord,

        hasPaid: true,
        paidAmount: 0,

        needsPasswordSetup: true,

        createdByAdmin: true,
        billingSource: "admin",
      });

      return NextResponse.json(
        { success: true, userId: String(user._id) },
        { status: 201 }
      );
    }

    /* ================= STAFF ================= */
    if (role === "staff") {
      const user = await User.create({
        name,
        email: normalizedEmail,
        role: "staff",

        hasPaid: false,
        paidAmount: 0,

        needsPasswordSetup: true,

        createdByAdmin: true,
        billingSource: "admin",
      });

      return NextResponse.json(
        { success: true, userId: String(user._id) },
        { status: 201 }
      );
    }

    /* ================= USER ================= */
    const recordsNum = Number(limits?.records || 0);
    const smsTotalNum = Number(limits?.smsTotal || 0);
    const priceNum = Number(billing?.price || 0);

    const finalIncludeCalls = !!limits?.includeCalls;
    const finalIncludeCreditGifts =
      plan === "plan3" || addons?.credit?.enabled === true;

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
      email: normalizedEmail,
      role: "user",

      plan: plan || "premium",
      planLimits,

      guests: recordsNum,
      maxMessages: smsTotalNum,

      includeCalls: finalIncludeCalls,
      includeCreditGifts: finalIncludeCreditGifts,
      creditGiftsAddonPrice: addons?.credit?.price || 0,

      hasPaid: false,
      paidAmount: priceNum,

      needsPasswordSetup: true,

      createdByAdmin: true,
      billingSource: "admin",
    });

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
