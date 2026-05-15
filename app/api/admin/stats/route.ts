import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";

import User from "@/models/User";
import Invitation from "@/models/Invitation";
import Payment from "@/models/Payment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    /* ======================================================
       AUTH
    ====================================================== */
    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (decoded.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    /* ======================================================
       MONTH / YEAR
    ====================================================== */
    const { searchParams } = new URL(req.url);

    const now = new Date();

    const queryMonth = Number(searchParams.get("month"));
    const queryYear = Number(searchParams.get("year"));

    const month =
      queryMonth >= 1 && queryMonth <= 12
        ? queryMonth
        : now.getMonth() + 1;

    const year =
      queryYear >= 2000
        ? queryYear
        : now.getFullYear();

    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 1, 0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /* ======================================================
       STATS
    ====================================================== */
    const [
      usersCount,
      activeInvitationsCount,
      callsCount,
      revenueAgg,
      payingCustomersAgg,
      paymentsCount,
      callsRevenueAgg,
      creditGiftsRevenueAgg,
    ] = await Promise.all([
      /* משתמשים קיימים כרגע */
      User.countDocuments(),

      /* אירועים פעילים = אירועים עתידיים בלבד */
      Invitation.countDocuments({
        $or: [
          { eventDate: { $gte: today } },
          { date: { $gte: today } },
          { "event.date": { $gte: today } },
          { "eventDetails.date": { $gte: today } },
        ],
      }),

      /* שירותי שיחות פעילים */
      User.countDocuments({ includeCalls: true }),

      /* הכנסה חודשית נטו */
      Payment.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lt: endDate,
            },
            isTest: { $ne: true },
            status: {
              $in: ["paid", "partially_refunded"],
            },
          },
        },
        {
          $project: {
            netAmount: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$amount", 0] },
                    { $ifNull: ["$refundAmount", 0] },
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$netAmount" },
          },
        },
      ]),

      /* לקוחות משלמים החודש + כמה כל אחד שילם */
      Payment.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lt: endDate,
            },
            isTest: { $ne: true },
            status: {
              $in: ["paid", "partially_refunded"],
            },
          },
        },
        {
          $project: {
            email: 1,
            amount: 1,
            refundAmount: 1,
            createdAt: 1,
            type: 1,
            priceKey: 1,
            includeCalls: 1,
            includeCreditGifts: 1,
            netAmount: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$amount", 0] },
                    { $ifNull: ["$refundAmount", 0] },
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: "$email",
            email: { $first: "$email" },
            totalPaid: { $sum: "$netAmount" },
            paymentsCount: { $sum: 1 },
            lastPaymentAt: { $max: "$createdAt" },
            types: { $addToSet: "$type" },
          },
        },
        {
          $sort: {
            totalPaid: -1,
          },
        },
      ]),

      /* מספר תשלומים בחודש */
      Payment.countDocuments({
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
        isTest: { $ne: true },
        status: {
          $in: ["paid", "partially_refunded"],
        },
      }),

      /* הכנסות משיחות */
      Payment.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lt: endDate,
            },
            isTest: { $ne: true },
            status: {
              $in: ["paid", "partially_refunded"],
            },
            includeCalls: true,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ["$callsAddonPrice", 0] } },
          },
        },
      ]),

      /* הכנסות ממתנות באשראי */
      Payment.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lt: endDate,
            },
            isTest: { $ne: true },
            status: {
              $in: ["paid", "partially_refunded"],
            },
            includeCreditGifts: true,
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: { $ifNull: ["$creditGiftsAddonPrice", 0] },
            },
          },
        },
      ]),
    ]);

    const revenue =
      revenueAgg.length > 0
        ? Number(revenueAgg[0].totalRevenue || 0)
        : 0;

    const payingCustomers = payingCustomersAgg.map((customer: any) => ({
      email: customer.email || "ללא אימייל",
      totalPaid: Number(customer.totalPaid || 0),
      paymentsCount: Number(customer.paymentsCount || 0),
      lastPaymentAt: customer.lastPaymentAt || null,
      types: customer.types || [],
    }));

    const callsRevenue =
      callsRevenueAgg.length > 0
        ? Number(callsRevenueAgg[0].total || 0)
        : 0;

    const creditGiftsRevenue =
      creditGiftsRevenueAgg.length > 0
        ? Number(creditGiftsRevenueAgg[0].total || 0)
        : 0;

    return NextResponse.json(
      {
        users: usersCount,
        invitations: activeInvitationsCount,
        calls: callsCount,

        revenue,
        payingUsers: payingCustomers.length,
        payingCustomers,
        paymentsCount,

        callsRevenue,
        creditGiftsRevenue,

        month,
        year,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    console.error("❌ Admin stats error:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}