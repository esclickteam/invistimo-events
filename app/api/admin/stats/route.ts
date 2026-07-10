import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";

import User from "@/models/User";
import Invitation from "@/models/Invitation";
import Payment from "@/models/Payment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * כאן הרחבתי סטטוסים כדי שלא ייספרו רק paid.
 * אם אצלך במונגו יש סטטוס אחר לתשלום מוצלח, תוסיפי אותו פה.
 */
const PAID_STATUSES = [
  "paid",
  "partially_refunded",
  "success",
  "succeeded",
  "completed",
  "approved",
  "captured",
];

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
    ""
  );
}

function getPaymentPackageLabel(payment: any) {
  if (payment.packageLabel) return payment.packageLabel;
  if (payment.packageName) return payment.packageName;
  if (payment.priceKey) return payment.priceKey;

  if (payment.maxGuests) {
    return `חבילה עד ${payment.maxGuests} מוזמנים`;
  }

  if (payment.type === "package") return "חבילה";
  if (payment.type === "addon") return "תוספת";
  if (payment.type === "upgrade") return "שדרוג";
  if (payment.type === "producer-client") return "לקוח מפיק";

  return "לא הוגדרה חבילה";
}

/**
 * שדה תאריך אחיד לתשלום.
 * קודם paidAt/paymentDate/paidDate/chargedAt, ורק בסוף createdAt.
 */
const paymentDateExpression = {
  $ifNull: [
    "$paidAt",
    {
      $ifNull: [
        "$paymentDate",
        {
          $ifNull: [
            "$paidDate",
            {
              $ifNull: ["$chargedAt", "$createdAt"],
            },
          ],
        },
      ],
    },
  ],
};

function paidDateMatch(startDate: Date, endDate: Date) {
  return {
    $expr: {
      $and: [
        { $gte: [paymentDateExpression, startDate] },
        { $lt: [paymentDateExpression, endDate] },
      ],
    },
  };
}

const netAmountExpression = {
  $max: [
    0,
    {
      $subtract: [
        { $ifNull: ["$amount", 0] },
        { $ifNull: ["$refundAmount", 0] },
      ],
    },
  ],
};

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

    const basePaidMatch = {
      isTest: { $ne: true },
      status: { $in: PAID_STATUSES },
    };

    const monthlyPaidMatch = {
      ...basePaidMatch,
      ...paidDateMatch(startDate, endDate),
    };

    const rangePaidMatch = {
      ...basePaidMatch,
      ...paidDateMatch(rangeStartDate, rangeEndDate),
    };

    const [
      usersCount,
      activeInvitationsCount,
      callsCount,

      revenueAgg,
      payingCustomersAgg,
      paymentsCountAgg,
      callsRevenueAgg,
      creditGiftsRevenueAgg,

      rangeRevenueAgg,
      rangeMonthlyAgg,
      rangeCustomersAgg,
      rangePaymentsCountAgg,
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

      User.countDocuments({ includeCalls: true }),

      Payment.aggregate([
        { $match: monthlyPaidMatch },
        {
          $project: {
            netAmount: netAmountExpression,
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$netAmount" },
          },
        },
      ]),

      Payment.aggregate([
        { $match: monthlyPaidMatch },
        {
          $project: {
            email: 1,
            amount: 1,
            refundAmount: 1,
            type: 1,
            priceKey: 1,
            packageLabel: 1,
            packageName: 1,
            maxGuests: 1,
            includeCalls: 1,
            includeCreditGifts: 1,
            callsAddonPrice: 1,
            creditGiftsAddonPrice: 1,
            paidDate: paymentDateExpression,
            netAmount: netAmountExpression,
          },
        },
        {
          $sort: {
            paidDate: -1,
          },
        },
        {
          $group: {
            _id: "$email",
            email: { $first: "$email" },
            totalPaid: { $sum: "$netAmount" },
            paymentsCount: { $sum: 1 },
            lastPaymentAt: { $first: "$paidDate" },
            types: { $addToSet: "$type" },
            lastType: { $first: "$type" },
            lastPriceKey: { $first: "$priceKey" },
            lastPackageLabel: { $first: "$packageLabel" },
            lastPackageName: { $first: "$packageName" },
            lastMaxGuests: { $first: "$maxGuests" },
            hasCallsAddon: { $max: "$includeCalls" },
            hasCreditGiftsAddon: { $max: "$includeCreditGifts" },
          },
        },
        {
          $sort: {
            totalPaid: -1,
          },
        },
      ]),

      Payment.aggregate([
        { $match: monthlyPaidMatch },
        {
          $count: "total",
        },
      ]),

      Payment.aggregate([
        {
          $match: {
            ...monthlyPaidMatch,
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

      Payment.aggregate([
        {
          $match: {
            ...monthlyPaidMatch,
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

      Payment.aggregate([
        { $match: rangePaidMatch },
        {
          $project: {
            netAmount: netAmountExpression,
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$netAmount" },
          },
        },
      ]),

      Payment.aggregate([
        { $match: rangePaidMatch },
        {
          $project: {
            paidDate: paymentDateExpression,
            netAmount: netAmountExpression,
          },
        },
        {
          $project: {
            year: { $year: "$paidDate" },
            month: { $month: "$paidDate" },
            netAmount: 1,
          },
        },
        {
          $group: {
            _id: {
              year: "$year",
              month: "$month",
            },
            revenue: { $sum: "$netAmount" },
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

      Payment.aggregate([
        { $match: rangePaidMatch },
        {
          $group: {
            _id: "$email",
          },
        },
        {
          $count: "total",
        },
      ]),

      Payment.aggregate([
        { $match: rangePaidMatch },
        {
          $count: "total",
        },
      ]),

      Payment.aggregate([
        { $match: rangePaidMatch },
        {
          $project: {
            type: { $ifNull: ["$type", "other"] },
            netAmount: netAmountExpression,
          },
        },
        {
          $group: {
            _id: "$type",
            revenue: { $sum: "$netAmount" },
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

    const customerEmails = payingCustomersAgg
      .map((customer: any) => customer.email)
      .filter(Boolean);

    const usersByEmailRaw = await User.find({
      email: { $in: customerEmails },
    })
      .select(
        "email name fullName firstName lastName clientName businessName packageName planName subscriptionPlan priceKey maxGuests",
      )
      .lean();

    const usersMap = new Map<string, any>();

    usersByEmailRaw.forEach((user: any) => {
      if (user.email) {
        usersMap.set(String(user.email).toLowerCase(), user);
      }
    });

    const payingCustomers = payingCustomersAgg.map((customer: any) => {
      const email = String(customer.email || "").toLowerCase();
      const user = usersMap.get(email);

      const userPackageName = getUserPackageName(user);

      const packageLabel =
        userPackageName ||
        getPaymentPackageLabel({
          packageLabel: customer.lastPackageLabel,
          packageName: customer.lastPackageName,
          priceKey: customer.lastPriceKey,
          maxGuests: customer.lastMaxGuests,
          type: customer.lastType,
        });

      return {
        email: customer.email || "ללא אימייל",
        name: getUserDisplayName(user) || "לא הוגדר שם",
        packageName: packageLabel,
        maxGuests: customer.lastMaxGuests || user?.maxGuests || null,
        totalPaid: Number(customer.totalPaid || 0),
        paymentsCount: Number(customer.paymentsCount || 0),
        lastPaymentAt: customer.lastPaymentAt || null,
        types: customer.types || [],
        hasCallsAddon: Boolean(customer.hasCallsAddon),
        hasCreditGiftsAddon: Boolean(customer.hasCreditGiftsAddon),
      };
    });

    const revenue =
      revenueAgg.length > 0 ? Number(revenueAgg[0].totalRevenue || 0) : 0;

    const paymentsCount =
      paymentsCountAgg.length > 0 ? Number(paymentsCountAgg[0].total || 0) : 0;

    const callsRevenue =
      callsRevenueAgg.length > 0 ? Number(callsRevenueAgg[0].total || 0) : 0;

    const creditGiftsRevenue =
      creditGiftsRevenueAgg.length > 0
        ? Number(creditGiftsRevenueAgg[0].total || 0)
        : 0;

    const rangeRevenue =
      rangeRevenueAgg.length > 0
        ? Number(rangeRevenueAgg[0].totalRevenue || 0)
        : 0;

    const rangeCustomers =
      rangeCustomersAgg.length > 0 ? Number(rangeCustomersAgg[0].total || 0) : 0;

    const rangePaymentsCount =
      rangePaymentsCountAgg.length > 0
        ? Number(rangePaymentsCountAgg[0].total || 0)
        : 0;

    const rangeMonthlyBreakdown = rangeMonthlyAgg.map((item: any) => ({
      year: item._id.year,
      month: item._id.month,
      revenue: Number(item.revenue || 0),
      paymentsCount: Number(item.paymentsCount || 0),
    }));

    const rangeByType = rangeByTypeAgg.map((item: any) => ({
      type: item._id,
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