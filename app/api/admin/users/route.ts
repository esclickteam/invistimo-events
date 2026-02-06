import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { sendPasswordSetupMail } from "@/lib/sendPasswordSetupMail";

export const dynamic = "force-dynamic";

/* =========================================================
   GET – ADMIN USERS LIST
========================================================= */
export async function GET() {
  try {
    console.log("👮 ADMIN USERS GET – start");

    await connectDB();
    console.log("✅ DB connected");

    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      console.warn("⛔ No authToken");
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (decoded.role !== "admin") {
      console.warn("⛔ Not admin");
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
      `)
      .sort({ createdAt: -1 })
      .lean();

    console.log("📦 Users fetched:", users.length);

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

    console.log("💰 Total revenue:", totalRevenue);

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
    console.log("👮 ADMIN USERS POST – start");

    await connectDB();
    console.log("✅ DB connected");

    const token = req.cookies.get("authToken")?.value;
    if (!token) {
      console.warn("⛔ No authToken");
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (decoded.role !== "admin") {
      console.warn("⛔ Not admin");
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const body = await req.json();
    console.log("📥 Request body:", body);

    const { name, email, role, limits, billing } = body;

    if (!name || !email || !role) {
      console.warn("⛔ Missing required fields");
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* ================= PRODUCER ================= */
    if (role === "producer") {
      console.log("🎬 Creating PRODUCER:", email);

      const user = await User.create({
        name,
        email,
        role: "producer",

        hasPaid: true,
        paidAmount: 0,

        needsPasswordSetup: true,
        createdByAdmin: true,
        billingSource: "admin",
      });

      console.log("✅ Producer created:", user._id.toString());

      try {
        console.log("📧 Sending password setup mail to producer:", user.email);
        await sendPasswordSetupMail(user._id.toString());
        console.log("✅ Password setup mail sent to producer");
      } catch (mailErr) {
        console.error("❌ Failed to send producer password mail:", mailErr);
      }

      return NextResponse.json({
        success: true,
        userId: String(user._id),
      });
    }

    /* ================= USER ================= */
    const { records, smsTotal, includeCalls } = limits || {};
    const { price, paymentStatus } = billing || {};

    if (!records || !smsTotal || !price) {
      console.warn("⛔ Invalid limits / billing");
      return NextResponse.json(
        { success: false, error: "Invalid limits / billing" },
        { status: 400 }
      );
    }

    console.log("👤 Creating USER:", email, "paymentStatus:", paymentStatus);

    const user = await User.create({
      name,
      email,
      role: "user",

      guests: records,
      maxMessages: smsTotal,
      includeCalls: !!includeCalls,

      hasPaid: paymentStatus === "paid",
      paidAmount: Number(price),

      needsPasswordSetup: true,
      createdByAdmin: true,
      billingSource: "admin",
    });

    console.log("✅ User created:", user._id.toString());

    if (paymentStatus === "paid") {
      try {
        console.log("📧 Sending password setup mail to user:", user.email);
        await sendPasswordSetupMail(user._id.toString());
        console.log("✅ Password setup mail sent to user");
      } catch (mailErr) {
        console.error("❌ Failed to send user password mail:", mailErr);
      }
    } else {
      console.log("💳 Stripe flow – password mail will be sent via webhook");
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
