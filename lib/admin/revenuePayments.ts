import User from "@/models/User";
import Payment from "@/models/Payment";
import RetainedCustomerFinancial from "@/models/RetainedCustomerFinancial";

/**
 * תאריך תשלום ישן ליוזרים שאין להם payments[].
 * חשוב: לא משתמשים ב-updatedAt — כל שמירה על היוזר הייתה
 * גורמת לסכום ישן "לקפוץ" שוב לחודש הנוכחי.
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
                "$manualPaidAt",
                {
                  $ifNull: ["$subscriptionPaidAt", "$createdAt"],
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
        { $ne: [legacyUserRevenueDateExpression, null] },
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
export function paymentsArrayPipeline(startDate: Date, endDate: Date) {
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
          $let: {
            vars: {
              rawAmount: { $ifNull: ["$payments.amount", 0] },
              paymentType: {
                $toLower: { $ifNull: ["$payments.type", "payment"] },
              },
            },
            in: {
              $cond: [
                { $eq: ["$$paymentType", "refund"] },
                { $multiply: ["$$rawAmount", -1] },
                "$$rawAmount",
              ],
            },
          },
        },

        paymentDate: {
          $ifNull: [
            "$payments.paidAt",
            {
              $ifNull: [
                "$payments.createdAt",
                {
                  $ifNull: [
                    "$paidAt",
                    {
                      $ifNull: ["$manualPaidAt", "$createdAt"],
                    },
                  ],
                },
              ],
            },
          ],
        },

        paymentType: {
          $toLower: { $ifNull: ["$payments.type", "payment"] },
        },

        paymentStatus: {
          $toLower: { $ifNull: ["$payments.status", "paid"] },
        },
      },
    },
    {
      $match: {
        paymentAmount: { $ne: 0 },
        paymentDate: {
          $ne: null,
          $gte: startDate,
          $lt: endDate,
        },
        $or: [
          {
            paymentStatus: "paid",
            paymentType: { $ne: "refund" },
          },
          {
            paymentType: "refund",
            paymentStatus: { $in: ["paid", "refunded"] },
          },
        ],
      },
    },
  ];
}

export function legacyPaymentsPipeline(startDate: Date, endDate: Date) {
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

/**
 * A retained snapshot counts only after its user record is gone,
 * so creating the snapshot cannot double-count a customer who is still active.
 */
function retainedOnlyPipeline(stages: object[]) {
  return [
    {
      $lookup: {
        from: "users",
        localField: "originalUserId",
        foreignField: "_id",
        as: "liveUser",
      },
    },
    {
      $match: { liveUser: { $size: 0 } },
    },
    ...stages,
  ];
}

/**
 * Payment rows whose customer user is already gone and that were not copied
 * into a retained snapshot. Live customers and snapshotted deletions stay on
 * their existing pipelines so they are not counted twice.
 */
function orphanLedgerPipeline(startDate: Date, endDate: Date) {
  return [
    {
      $match: {
        isTest: { $ne: true },
        status: "paid",
        amount: { $gt: 0 },
        createdAt: { $gte: startDate, $lt: endDate },
      },
    },
    {
      $addFields: {
        emailKey: { $toLower: { $ifNull: ["$email", ""] } },
      },
    },
    { $match: { emailKey: { $ne: "" } } },
    {
      $lookup: {
        from: "users",
        let: { emailKey: "$emailKey" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [{ $toLower: { $ifNull: ["$email", ""] } }, "$$emailKey"],
              },
            },
          },
          { $project: { _id: 1 } },
          { $limit: 1 },
        ],
        as: "liveUser",
      },
    },
    {
      $lookup: {
        from: "retainedcustomerfinancials",
        let: { emailKey: "$emailKey" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [{ $toLower: { $ifNull: ["$email", ""] } }, "$$emailKey"],
              },
            },
          },
          { $project: { _id: 1 } },
          { $limit: 1 },
        ],
        as: "retained",
      },
    },
    {
      $match: {
        liveUser: { $size: 0 },
        retained: { $size: 0 },
      },
    },
    {
      $project: {
        email: "$emailKey",
        paymentAmount: "$amount",
        paymentDate: "$createdAt",
        paymentType: { $toLower: { $ifNull: ["$type", "package"] } },
        paymentStatus: "paid",
      },
    },
  ];
}

export async function loadRevenuePaymentRows(startDate: Date, endDate: Date) {
  const [fromArray, legacy, retainedArray, retainedLegacy, orphanLedger] =
    await Promise.all([
      User.aggregate(paymentsArrayPipeline(startDate, endDate)),
      User.aggregate(legacyPaymentsPipeline(startDate, endDate)),
      RetainedCustomerFinancial.aggregate(
        retainedOnlyPipeline(paymentsArrayPipeline(startDate, endDate))
      ),
      RetainedCustomerFinancial.aggregate(
        retainedOnlyPipeline(legacyPaymentsPipeline(startDate, endDate))
      ),
      Payment.aggregate(orphanLedgerPipeline(startDate, endDate)),
    ]);

  return [
    ...fromArray,
    ...legacy,
    ...retainedArray,
    ...retainedLegacy,
    ...orphanLedger,
  ];
}

export async function sumRevenueBetween(startDate: Date, endDate: Date) {
  const rows = await loadRevenuePaymentRows(startDate, endDate);
  return rows.reduce(
    (sum: number, item: { paymentAmount?: number }) =>
      sum + Number(item.paymentAmount || 0),
    0
  );
}
