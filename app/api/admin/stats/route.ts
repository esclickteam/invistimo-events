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
 * תאריך תשלום ישן ליוזרים שאין להם payments[].
 */
const legacyUserRevenueDateExpression = {
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
 * סכום תשלום ישן ליוזרים שאין להם payments[].
 */
const legacyUserRevenueAmountExpression = {
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

function legacyDateMatch(startDate: Date, endDate: Date) {
  return {
    $expr: {
      $and: [
        { $gte: [legacyUserRevenueDateExpression, startDate] },
        { $lt: [legacyUserRevenueDateExpression, endDate] },
      ],
    },
  };
}

/**
 * משמש רק לגיבוי:
 * אם יש ליוזר payments[] — לא סופרים את paidAmount כדי לא להכפיל.
 * אם אין payments[] — סופרים paidAmount לפי התאריך הישן.
 */
function buildLegacyPaidUserMatch(startDate: Date, endDate: Date) {
  return {
    isDemoUser: { $ne: true },
    isTest: { $ne: true },
    hasPaid: true,
    paidAmount: { $gt: 0 },
    $or: [
      { payments: { $exists: false } },
      { payments: null },
      { payments: { $size: 0 } },
    ],
    ...legacyDateMatch(startDate, endDate),
  };
}

/**
 * שלב אגרגציה שמוציא כל תשלום מתוך User.payments[]
 * תשלום ביולי ייספר ביולי, תשלום יתרה באוגוסט ייספר באוגוסט.
 */
function paymentsArrayPipeline(startDate: Date, endDate: Date) {
  return [
    {
      $match: {
        isDemoUser: { $ne: true },
        isTest: { $ne: true },
        payments: { $exists: true, $type: "array", $ne: [] },
      },
    },
    {
      $unwind: "$payments",
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

        paymentAmount: {
          $ifNull: ["$payments.amount", 0],
        },

        paymentDate: {
          $ifNull: [
            "$payments.paidAt",
            {
              $ifNull: [
                "$payments.createdAt",
                {
                  $ifNull: ["$paidAt", "$createdAt"],
                },
              ],
            },
          ],
        },

        paymentType: {
          $ifNull: ["$payments.type", "payment"],
        },

        paymentStatus: {
          $ifNull: ["$payments.status", "paid"],
        },
      },
    },
    {
      $match: {
        paymentAmount: { $gt: 0 },
        paymentDate: {
          $gte: startDate,
          $lt: endDate,
        },
        paymentStatus: {
          $nin: ["cancelled", "canceled", "failed", "refunded"],
        },
      },
    },
  ];
}

function legacyPaymentsPipeline(startDate: Date, endDate: Date) {
  return [
    {
      $match: buildLegacyPaidUserMatch(startDate, endDate),
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

        paymentAmount: legacyUserRevenueAmountExpression,
        paymentDate: legacyUserRevenueDateExpression,
        paymentType: "legacy",
        paymentStatus: "paid",
      },
    },
    {
      $match: {
        paymentAmount: { $gt: 0 },
      },
    },
  ];
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

    const [
      usersCount,
      activeInvitationsCount,
      callsCount,

      monthlyPaymentsFromArray,
      monthlyLegacyPayments,

      rangePaymentsFromArray,
      rangeLegacyPayments,
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

      User.aggregate(paymentsArrayPipeline(startDate, endDate)),
      User.aggregate(legacyPaymentsPipeline(startDate, endDate)),

      User.aggregate(paymentsArrayPipeline(rangeStartDate, rangeEndDate)),
      User.aggregate(legacyPaymentsPipeline(rangeStartDate, rangeEndDate)),
    ]);

    const monthlyPayments = [
      ...monthlyPaymentsFromArray,
      ...monthlyLegacyPayments,
    ];

    const rangePayments = [
      ...rangePaymentsFromArray,
      ...rangeLegacyPayments,
    ];

    const revenue = monthlyPayments.reduce((sum: number, item: any) => {
      return sum + Number(item.paymentAmount || 0);
    }, 0);

    const paymentsCount = monthlyPayments.length;

    const payingCustomersMap = new Map<string, any>();

    for (const payment of monthlyPayments) {
      const key = String(payment.email || payment._id || Math.random()).toLowerCase();
      const existing = payingCustomersMap.get(key);

      if (!existing) {
        payingCustomersMap.set(key, {
          ...payment,
          totalPaid: Number(payment.paymentAmount || 0),
          paymentsCount: 1,
          lastPaymentAt: payment.paymentDate || null,
          types: [payment.paymentType || payment.priceKey || payment.plan || "payment"],
        });
      } else {
        existing.totalPaid += Number(payment.paymentAmount || 0);
        existing.paymentsCount += 1;

        const currentDate = new Date(existing.lastPaymentAt || 0).getTime();
        const nextDate = new Date(payment.paymentDate || 0).getTime();

        if (nextDate > currentDate) {
          existing.lastPaymentAt = payment.paymentDate || null;
        }

        existing.types = Array.from(
          new Set([
            ...(existing.types || []),
            payment.paymentType || payment.priceKey || payment.plan || "payment",
          ]),
        );
      }
    }

    const payingCustomers = Array.from(payingCustomersMap.values())
      .sort((a: any, b: any) => Number(b.totalPaid || 0) - Number(a.totalPaid || 0))
      .map((user: any) => {
        return {
          email: user.email || "ללא אימייל",
          name: getUserDisplayName(user) || "לא הוגדר שם",
          packageName: getPackageLabel(user),
          maxGuests: user.maxGuests || null,
          totalPaid: Number(user.totalPaid || 0),
          paymentsCount: Number(user.paymentsCount || 0),
          lastPaymentAt: user.lastPaymentAt || null,
          types: user.types || [user.priceKey || user.plan || "payment"],
          hasCallsAddon: Boolean(user.includeCalls),
          hasCreditGiftsAddon: Boolean(user.includeCreditGifts),
        };
      });

    const callsRevenue = monthlyPayments.reduce((sum: number, user: any) => {
      if (!user.includeCalls) return sum;
      return sum + Number(user.callsAddonPrice || 0);
    }, 0);

    const creditGiftsRevenue = monthlyPayments.reduce((sum: number, user: any) => {
      if (!user.includeCreditGifts) return sum;
      return sum + Number(user.creditGiftsAddonPrice || 0);
    }, 0);

    const rangeRevenue = rangePayments.reduce((sum: number, item: any) => {
      return sum + Number(item.paymentAmount || 0);
    }, 0);

    const rangePaymentsCount = rangePayments.length;

    const rangeCustomersSet = new Set(
      rangePayments.map((item: any) => String(item.email || item._id || "").toLowerCase()).filter(Boolean),
    );

    const rangeCustomers = rangeCustomersSet.size;

    const monthlyBreakdownMap = new Map<string, {
      year: number;
      month: number;
      revenue: number;
      paymentsCount: number;
    }>();

    for (const payment of rangePayments) {
      const date = new Date(payment.paymentDate);

      if (Number.isNaN(date.getTime())) continue;

      const itemYear = date.getFullYear();
      const itemMonth = date.getMonth() + 1;
      const key = `${itemYear}-${String(itemMonth).padStart(2, "0")}`;

      const existing =
        monthlyBreakdownMap.get(key) ||
        {
          year: itemYear,
          month: itemMonth,
          revenue: 0,
          paymentsCount: 0,
        };

      existing.revenue += Number(payment.paymentAmount || 0);
      existing.paymentsCount += 1;

      monthlyBreakdownMap.set(key, existing);
    }

    const rangeMonthlyBreakdown = Array.from(monthlyBreakdownMap.values())
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      })
      .map((item) => ({
        year: item.year,
        month: item.month,
        revenue: Math.round((item.revenue + Number.EPSILON) * 100) / 100,
        paymentsCount: item.paymentsCount,
      }));

    const byTypeMap = new Map<string, {
      type: string;
      revenue: number;
      paymentsCount: number;
    }>();

    for (const payment of rangePayments) {
      const type = String(
        payment.paymentType ||
          payment.priceKey ||
          payment.plan ||
          payment.packageName ||
          "payment",
      );

      const existing =
        byTypeMap.get(type) ||
        {
          type,
          revenue: 0,
          paymentsCount: 0,
        };

      existing.revenue += Number(payment.paymentAmount || 0);
      existing.paymentsCount += 1;

      byTypeMap.set(type, existing);
    }

    const rangeByType = Array.from(byTypeMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((item) => ({
        type: item.type,
        revenue: Math.round((item.revenue + Number.EPSILON) * 100) / 100,
        paymentsCount: item.paymentsCount,
      }));

    return NextResponse.json(
      {
        users: usersCount,
        invitations: activeInvitationsCount,
        calls: callsCount,

        revenue: Math.round((revenue + Number.EPSILON) * 100) / 100,
        payingUsers: payingCustomers.length,
        payingCustomers,
        paymentsCount,

        callsRevenue: Math.round((callsRevenue + Number.EPSILON) * 100) / 100,
        creditGiftsRevenue: Math.round(
          (creditGiftsRevenue + Number.EPSILON) * 100,
        ) / 100,

        month,
        year,

        rangeSummary: {
          fromDay,
          fromMonth,
          fromYear,
          toDay,
          toMonth,
          toYear,
          revenue: Math.round((rangeRevenue + Number.EPSILON) * 100) / 100,
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