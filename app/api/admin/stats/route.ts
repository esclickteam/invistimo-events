import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";

import User from "@/models/User";
import Invitation from "@/models/Invitation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getMonthRange(year: number, month: number) {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 1, 0, 0, 0, 0);

  return { startDate, endDate };
}

function getRangeDates(params: {
  fromYear: number;
  fromMonth: number;
  fromDay: number;
  toYear: number;
  toMonth: number;
  toDay: number;
}) {
  const rangeStartDate = new Date(
    params.fromYear,
    params.fromMonth - 1,
    params.fromDay,
    0,
    0,
    0,
    0,
  );

  const rangeEndDate = new Date(
    params.toYear,
    params.toMonth - 1,
    params.toDay + 1,
    0,
    0,
    0,
    0,
  );

  return { rangeStartDate, rangeEndDate };
}

function getUserDisplayName(user: any) {
  if (!user) return "";

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    user.fullName ||
    user.name ||
    user.clientName ||
    user.businessName ||
    fullName ||
    ""
  );
}

function getUserPackageName(user: any) {
  if (!user) return "";

  return (
    user.packageName ||
    user.planName ||
    user.subscriptionPlan ||
    user.priceKey ||
    user.plan ||
    ""
  );
}

function getPackageLabel(user: any) {
  const direct = getUserPackageName(user);

  if (direct) return direct;

  if (user?.maxGuests) {
    return `חבילה עד ${user.maxGuests} מוזמנים`;
  }

  return "לא הוגדרה חבילה";
}

/**
 * תאריך תשלום לפי המודל של User.
 * קודם מחפש שדה תשלום אם קיים, ואם אין — משתמש ב-createdAt.
 * לפי הצילום שלך createdAt הוא יולי, ולכן הוא ייכנס ליולי.
 */
const userRevenueDateExpression = {
  $ifNull: [
    "$paidAt",
    {
      $ifNull: [
        "$paymentDate",
        {
          $ifNull: [
            "$lastPaymentAt",
            {
              $ifNull: [
                "$subscriptionPaidAt",
                {
                  $ifNull: ["$createdAt", "$updatedAt"],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/**
 * סכום הכנסה לפי User.
 * לפי הצילום שלך השדה הוא paidAmount.
 */
const userRevenueAmountExpression = {
  $ifNull: [
    "$paidAmount",
    {
      $ifNull: [
        "$totalPaid",
        {
          $ifNull: [
            "$amountPaid",
            {
              $ifNull: [
                "$packagePrice",
                {
                  $ifNull: [
                    "$planPrice",
                    {
                      $ifNull: [
                        "$subscriptionPrice",
                        {
                          $ifNull: ["$price", 0],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

function userRevenueDateMatch(startDate: Date, endDate: Date) {
  return {
    $expr: {
      $and: [
        { $gte: [userRevenueDateExpression, startDate] },
        { $lt: [userRevenueDateExpression, endDate] },
      ],
    },
  };
}

function buildPaidUserMatch(startDate: Date, endDate: Date) {
  return {
    isDemoUser: { $ne: true },
    isTest: { $ne: true },
    hasPaid: true,
    paidAmount: { $gt: 0 },
    ...userRevenueDateMatch(startDate, endDate),
  };
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const cookieStore = await cookies();
    const token = cookieStore.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const now = new Date();

    const queryMonth = Number(searchParams.get("month"));
    const queryYear = Number(searchParams.get("year"));

    const month =
      queryMonth >= 1 && queryMonth <= 12 ? queryMonth : now.getMonth() + 1;

    const year = queryYear >= 2000 ? queryYear : now.getFullYear();

    const fromDayQuery = Number(searchParams.get("fromDay"));
    const fromMonthQuery = Number(searchParams.get("fromMonth"));
    const fromYearQuery = Number(searchParams.get("fromYear"));

    const toDayQuery = Number(searchParams.get("toDay"));
    const toMonthQuery = Number(searchParams.get("toMonth"));
    const toYearQuery = Number(searchParams.get("toYear"));

    const fromDay =
      fromDayQuery >= 1 && fromDayQuery <= 31 ? fromDayQuery : 1;

    const fromMonth =
      fromMonthQuery >= 1 && fromMonthQuery <= 12 ? fromMonthQuery : 1;

    const fromYear = fromYearQuery >= 2000 ? fromYearQuery : now.getFullYear();

    const toDay = toDayQuery >= 1 && toDayQuery <= 31 ? toDayQuery : 31;

    const toMonth =
      toMonthQuery >= 1 && toMonthQuery <= 12 ? toMonthQuery : 12;

    const toYear = toYearQuery >= 2000 ? toYearQuery : now.getFullYear();

    const { startDate, endDate } = getMonthRange(year, month);

    let { rangeStartDate, rangeEndDate } = getRangeDates({
      fromYear,
      fromMonth,
      fromDay,
      toYear,
      toMonth,
      toDay,
    });

    if (rangeStartDate > rangeEndDate) {
      const fixed = getRangeDates({
        fromYear: toYear,
        fromMonth: toMonth,
        fromDay: toDay,
        toYear: fromYear,
        toMonth: fromMonth,
        toDay: fromDay,
      });

      rangeStartDate = fixed.rangeStartDate;
      rangeEndDate = fixed.rangeEndDate;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthlyPaidUserMatch = buildPaidUserMatch(startDate, endDate);
    const rangePaidUserMatch = buildPaidUserMatch(rangeStartDate, rangeEndDate);

    const [
      usersCount,
      activeInvitationsCount,
      callsCount,

      revenueAgg,
      payingCustomersRaw,
      rangeRevenueAgg,
      rangeMonthlyAgg,
      rangeCustomersAgg,
      rangeByTypeAgg,
    ] = await Promise.all([
      User.countDocuments(),

      Invitation.countDocuments({
        $or: [
          { eventDate: { $gte: today } },
          { date: { $gte: today } },
          { "event.date": { $gte: today } },
          { "eventDetails.date": { $gte: today } },
          { "eventDetails.eventDate": { $gte: today } },
        ],
      }),

      User.countDocuments({
        includeCalls: true,
        hasPaid: true,
        paidAmount: { $gt: 0 },
      }),

      User.aggregate([
        {
          $match: monthlyPaidUserMatch,
        },
        {
          $project: {
            revenueAmount: userRevenueAmountExpression,
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$revenueAmount" },
            paymentsCount: { $sum: 1 },
          },
        },
      ]),

      User.aggregate([
        {
          $match: monthlyPaidUserMatch,
        },
        {
          $project: {
            email: 1,
            name: 1,
            fullName: 1,
            firstName: 1,
            lastName: 1,
            clientName: 1,
            businessName: 1,

            plan: 1,
            priceKey: 1,
            packageName: 1,
            planName: 1,
            subscriptionPlan: 1,
            maxGuests: 1,

            includeCalls: 1,
            includeCreditGifts: 1,
            callsAddonPrice: 1,
            creditGiftsAddonPrice: 1,

            paidAmount: userRevenueAmountExpression,
            paidDate: userRevenueDateExpression,
          },
        },
        {
          $match: {
            paidAmount: { $gt: 0 },
          },
        },
        {
          $sort: {
            paidDate: -1,
          },
        },
      ]),

      User.aggregate([
        {
          $match: rangePaidUserMatch,
        },
        {
          $project: {
            revenueAmount: userRevenueAmountExpression,
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$revenueAmount" },
            paymentsCount: { $sum: 1 },
          },
        },
      ]),

      User.aggregate([
        {
          $match: rangePaidUserMatch,
        },
        {
          $project: {
            paidDate: userRevenueDateExpression,
            revenueAmount: userRevenueAmountExpression,
          },
        },
        {
          $match: {
            revenueAmount: { $gt: 0 },
          },
        },
        {
          $project: {
            year: { $year: "$paidDate" },
            month: { $month: "$paidDate" },
            revenueAmount: 1,
          },
        },
        {
          $group: {
            _id: {
              year: "$year",
              month: "$month",
            },
            revenue: { $sum: "$revenueAmount" },
            paymentsCount: { $sum: 1 },
          },
        },
        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),

      User.aggregate([
        {
          $match: rangePaidUserMatch,
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

      User.aggregate([
        {
          $match: rangePaidUserMatch,
        },
        {
          $project: {
            revenueAmount: userRevenueAmountExpression,
            type: {
              $ifNull: [
                "$priceKey",
                {
                  $ifNull: [
                    "$plan",
                    {
                      $ifNull: ["$packageName", "user"],
                    },
                  ],
                },
              ],
            },
          },
        },
        {
          $match: {
            revenueAmount: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: "$type",
            revenue: { $sum: "$revenueAmount" },
            paymentsCount: { $sum: 1 },
          },
        },
        {
          $sort: {
            revenue: -1,
          },
        },
      ]),
    ]);

    const payingCustomers = payingCustomersRaw.map((user: any) => {
      return {
        email: user.email || "ללא אימייל",
        name: getUserDisplayName(user) || "לא הוגדר שם",
        packageName: getPackageLabel(user),
        maxGuests: user.maxGuests || null,
        totalPaid: Number(user.paidAmount || 0),
        paymentsCount: 1,
        lastPaymentAt: user.paidDate || null,
        types: [user.priceKey || user.plan || "user"],
        hasCallsAddon: Boolean(user.includeCalls),
        hasCreditGiftsAddon: Boolean(user.includeCreditGifts),
      };
    });

    const revenue =
      revenueAgg.length > 0 ? Number(revenueAgg[0].totalRevenue || 0) : 0;

    const paymentsCount =
      revenueAgg.length > 0 ? Number(revenueAgg[0].paymentsCount || 0) : 0;

    const callsRevenue = payingCustomersRaw.reduce((sum: number, user: any) => {
      if (!user.includeCalls) return sum;
      return sum + Number(user.callsAddonPrice || 0);
    }, 0);

    const creditGiftsRevenue = payingCustomersRaw.reduce(
      (sum: number, user: any) => {
        if (!user.includeCreditGifts) return sum;
        return sum + Number(user.creditGiftsAddonPrice || 0);
      },
      0,
    );

    const rangeRevenue =
      rangeRevenueAgg.length > 0
        ? Number(rangeRevenueAgg[0].totalRevenue || 0)
        : 0;

    const rangePaymentsCount =
      rangeRevenueAgg.length > 0
        ? Number(rangeRevenueAgg[0].paymentsCount || 0)
        : 0;

    const rangeCustomers =
      rangeCustomersAgg.length > 0 ? Number(rangeCustomersAgg[0].total || 0) : 0;

    const rangeMonthlyBreakdown = rangeMonthlyAgg.map((item: any) => ({
      year: item._id.year,
      month: item._id.month,
      revenue: Number(item.revenue || 0),
      paymentsCount: Number(item.paymentsCount || 0),
    }));

    const rangeByType = rangeByTypeAgg.map((item: any) => ({
      type: item._id || "user",
      revenue: Number(item.revenue || 0),
      paymentsCount: Number(item.paymentsCount || 0),
    }));

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

        rangeSummary: {
          fromDay,
          fromMonth,
          fromYear,
          toDay,
          toMonth,
          toYear,
          revenue: rangeRevenue,
          customers: rangeCustomers,
          paymentsCount: rangePaymentsCount,
          monthlyBreakdown: rangeMonthlyBreakdown,
          byType: rangeByType,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (err) {
    console.error("❌ Admin stats error:", err);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}