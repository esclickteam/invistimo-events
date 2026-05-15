import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";

import User from "@/models/User";
import Invitation from "@/models/Invitation";
import Payment from "@/models/Payment";

// 🔥 חובה לאדמין – בלי cache
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
       example:
       /api/admin/stats?month=5&year=2026
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

    /* ======================================================
       COUNTS + MONTHLY REVENUE

       מקור ההכנסה = Payment
       לכן אם מוחקים User אחרי שסיים פעילות,
       ההכנסה שכבר נרשמה ב-Payment לא יורדת.
    ====================================================== */
    const [
      usersCount,
      invitationsCount,
      callsCount,
      revenueAgg,
      payingUsersAgg,
      paymentsCount,
      callsRevenueAgg,
      creditGiftsRevenueAgg,
    ] = await Promise.all([
      /* 👤 סה״כ משתמשים שקיימים כרגע */
      User.countDocuments(),

      /* ✉️ סה״כ אירועים / הזמנות */
      Invitation.countDocuments(),

      /* ☎️ משתמשים עם שירות שיחות פעיל כרגע */
      User.countDocuments({ includeCalls: true }),

      /* 💰 הכנסה חודשית נטו לפי תשלומים */
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
            totalRevenue: {
              $sum: "$netAmount",
            },
          },
        },
      ]),

      /* 👥 כמה לקוחות ייחודיים שילמו בחודש הזה לפי email */
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
          $group: {
            _id: "$email",
          },
        },
        {
          $count: "total",
        },
      ]),

      /* 🧾 מספר תשלומים בחודש */
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

      /* ☎️ הכנסות משירות שיחות בחודש */
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
            total: {
              $sum: {
                $ifNull: ["$callsAddonPrice", 0],
              },
            },
          },
        },
      ]),

      /* 🎁 הכנסות מתוספת מתנות באשראי בחודש */
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
              $sum: {
                $ifNull: ["$creditGiftsAddonPrice", 0],
              },
            },
          },
        },
      ]),
    ]);

    const revenue =
      revenueAgg.length > 0
        ? Number(revenueAgg[0].totalRevenue || 0)
        : 0;

    const payingUsers =
      payingUsersAgg.length > 0
        ? Number(payingUsersAgg[0].total || 0)
        : 0;

    const callsRevenue =
      callsRevenueAgg.length > 0
        ? Number(callsRevenueAgg[0].total || 0)
        : 0;

    const creditGiftsRevenue =
      creditGiftsRevenueAgg.length > 0
        ? Number(creditGiftsRevenueAgg[0].total || 0)
        : 0;

    /* ======================================================
       RESPONSE
    ====================================================== */
    return NextResponse.json(
      {
        users: usersCount,
        invitations: invitationsCount,
        calls: callsCount,

        revenue,
        payingUsers,
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