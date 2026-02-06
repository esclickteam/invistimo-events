import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/* =========================================================
   GET – ADMIN USERS LIST
========================================================= */
export async function GET() {
  try {
    await connectDB();

    /* ================= AUTH ================= */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (decoded.role !== "admin") {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    /* ================= USERS ================= */
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

    /* ================= REVENUE ================= */
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
========================================================= */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    /* ================= AUTH ================= */
    const token = req.cookies.get("authToken")?.value;
    if (!token) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (decoded.role !== "admin") {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    /* ================= BODY ================= */
    const body = await req.json();
    const { email, role, limits, billing } = body;

    if (!email || !role) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    /* =====================================================
       PRODUCER
    ===================================================== */
    if (role === "producer") {
      const user = await User.create({
        email,
        role: "producer",
        hasPaid: true,
        paidAmount: 0,
        needsPasswordSetup: true,
      });

      return NextResponse.json({ success: true, user });
    }

    /* =====================================================
       USER / CLIENT
    ===================================================== */
    const {
      records,
      smsTotal,
      includeCalls,
    } = limits || {};

    const { price, paymentStatus } = billing || {};

    if (!records || !smsTotal || !price) {
      return NextResponse.json(
        { success: false, error: "Invalid limits / billing" },
        { status: 400 }
      );
    }

    /* ===== MANUAL PAYMENT ===== */
    if (paymentStatus === "paid") {
      const user = await User.create({
        email,
        role: "user",
        guests: records,
        maxMessages: smsTotal,
        includeCalls: !!includeCalls,
        hasPaid: true,
        paidAmount: price,
        needsPasswordSetup: true,
      });

      return NextResponse.json({ success: true, user });
    }

    /* ===== STRIPE PAYMENT ===== */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "ils",
            product_data: {
              name: `חבילת משתמש – ${records} רשומות`,
            },
            unit_amount: Math.round(Number(price) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/users?paid=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/users`,
      metadata: {
        email,
        role: "user",
        records: String(records),
        smsTotal: String(smsTotal),
        includeCalls: includeCalls ? "1" : "0",
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (err) {
    console.error("ADMIN USERS POST ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
