import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Payment from "@/models/Payment";
import { sendPasswordSetupMail } from "@/lib/sendPasswordSetupMail";

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
        name
        email
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
        producerPricePerRecord
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
    console.error("❌ ADMIN USERS GET ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/* =========================================================
   POST – CREATE USER (ADMIN)
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
    const { name, email, role, limits, billing } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* ================= PRODUCER ================= */
    if (role === "producer") {
      const pricePerRecord = Number(billing?.pricePerRecord || 0);

      const user = await User.create({
        name,
        email,
        role: "producer",

        producerPricePerRecord: pricePerRecord,

        hasPaid: true,
        paidAmount: 0,

        needsPasswordSetup: true,
        createdByAdmin: true,
        billingSource: "admin",
      });

      try {
        await sendPasswordSetupMail(user._id.toString());
      } catch (err) {
        console.error("❌ Failed to send producer password mail:", err);
      }

      return NextResponse.json({
        success: true,
        userId: String(user._id),
      });
    }

    /* ================= USER ================= */
    const { records, smsTotal, includeCalls } = limits || {};
    const { price, paymentStatus } = billing || {};

    const finalIncludeCalls = !!includeCalls;
    const finalIncludeCreditGifts = finalIncludeCalls; // ⭐ שיחות כוללות מתנות

    if (!records || !smsTotal || !price) {
      return NextResponse.json(
        { success: false, error: "Invalid limits / billing" },
        { status: 400 }
      );
    }

    const user = await User.create({
      name,
      email,
      role: "user",

      guests: records,
      maxMessages: smsTotal,

      includeCalls: finalIncludeCalls,
      includeCreditGifts: finalIncludeCreditGifts,

      hasPaid: paymentStatus === "paid",
      paidAmount: Number(price),

      needsPasswordSetup: true,
      createdByAdmin: true,
      billingSource: "admin",
    });

    /* ===== יצירת Payment ידני ===== */
    if (paymentStatus === "paid") {
      await Payment.create({
        email,

        stripeSessionId: null,
        stripePaymentIntentId: null,
        stripeCustomerId: null,
        stripePriceId: null,

        priceKey: `admin_manual_${records}`,
        maxGuests: records,

        includeCalls: finalIncludeCalls,
        callsAddonPrice: 0,

        includeCreditGifts: finalIncludeCreditGifts,
        creditGiftsAddonPrice: 0,

        amount: Number(price),
        refundAmount: 0,
        currency: "ils",

        type: "package",
        status: "paid",
        isTest: false,

        metadata: {
          source: "admin",
          adminId: decoded.id,
          userId: user._id.toString(),
        },
      });

      try {
        await sendPasswordSetupMail(user._id.toString());
      } catch (err) {
        console.error("❌ Failed to send user password mail:", err);
      }
    }

    return NextResponse.json({
      success: true,
      userId: String(user._id),
    });
  } catch (err) {
    console.error("🔥 ADMIN USERS POST ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
