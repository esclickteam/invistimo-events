import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/* =========================================================
   GET – ADMIN USERS LIST
========================================================= */
export async function GET() {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (decoded.role !== "admin") {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const users = await User.find({
      isDemoUser: { $ne: true },
      $or: [
        { hasPaid: true },
        { plan: "premium" },
        { createdByProducer: { $ne: null } },
        { role: "producer" },
      ],
    })
      .select(`
        email
        name
        role
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
      `)
      .sort({ createdAt: -1 })
      .lean();

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

    return NextResponse.json(
      { success: true, users, totalRevenue },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("ADMIN USERS GET ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/* =========================================================
   POST – CREATE USER (ADMIN)
   ❌ NO STRIPE HERE
========================================================= */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get("authToken")?.value;
    if (!token) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (decoded.role !== "admin") {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const body = await req.json();
    const { email, role, limits, billing } = body;

    if (!email || !role) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    /* ===== PRODUCER ===== */
    if (role === "producer") {
      const user = await User.create({
        email,
        role: "producer",
        hasPaid: true,
        paidAmount: 0,
        needsPasswordSetup: true,
      });

      return NextResponse.json({
        success: true,
        userId: String(user._id),
      });
    }

    /* ===== USER ===== */
    const { records, smsTotal, includeCalls } = limits || {};
    const { price, paymentStatus } = billing || {};

    if (!records || !smsTotal || !price) {
      return NextResponse.json(
        { success: false, error: "Invalid limits / billing" },
        { status: 400 }
      );
    }

    const user = await User.create({
      email,
      role: "user",
      guests: records,
      maxMessages: smsTotal,
      includeCalls: !!includeCalls,
      hasPaid: paymentStatus === "paid",
      paidAmount: paymentStatus === "paid" ? price : 0,
      needsPasswordSetup: true,
    });

    return NextResponse.json({
      success: true,
      userId: String(user._id),
    });
  } catch (err) {
    console.error("ADMIN USERS POST ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
