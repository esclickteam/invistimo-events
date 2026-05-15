import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Payment from "@/models/Payment";
import Invitation from "@/models/Invitation";
import { sendPasswordSetupMail } from "@/lib/sendPasswordSetupMail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* =========================================================
   PLAN CONFIG
========================================================= */
const PLAN_CONFIG: Record<
  string,
  {
    label: string;
    guests: number;
    sms: number;
    price: number;
    includeCalls: boolean;
    includeCreditGifts: boolean;
    includeDigitalSeating: boolean;
    includeEventManagement: boolean;
  }
> = {
  plan1: {
    label: "חבילה 1",
    guests: 100,
    sms: 300,
    price: 402,
    includeCalls: false,
    includeCreditGifts: false,
    includeDigitalSeating: false,
    includeEventManagement: false,
  },

  plan2: {
    label: "חבילה 2",
    guests: 200,
    sms: 600,
    price: 789,
    includeCalls: true,
    includeCreditGifts: false,
    includeDigitalSeating: false,
    includeEventManagement: false,
  },

  plan3: {
    label: "חבילה 3",
    guests: 300,
    sms: 900,
    price: 1171,
    includeCalls: true,
    includeCreditGifts: true,
    includeDigitalSeating: true,
    includeEventManagement: true,
  },
};

/* =========================================================
   HELPERS
========================================================= */
function getPlanConfig(plan?: string) {
  return PLAN_CONFIG[String(plan || "plan1")] || PLAN_CONFIG.plan1;
}

function normalizeEmail(email?: string) {
  return String(email || "").trim().toLowerCase();
}

function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

function buildUsersFilter(req: Request) {
  const { searchParams } = new URL(req.url);

  const scope = (searchParams.get("scope") || "all").toLowerCase();
  const q = (searchParams.get("q") || "").trim();

  const baseFilter: any = {
    isDemoUser: { $ne: true },
  };

  const activeFilter: any = {
    ...baseFilter,
    $or: [
      { hasPaid: true },
      { plan: "premium" },
      { plan: "plan1" },
      { plan: "plan2" },
      { plan: "plan3" },
      { createdByProducer: { $ne: null } },
      { role: "producer" },
      { role: "staff" },
    ],
  };

  const filter: any = scope === "active" ? activeFilter : baseFilter;

  if (q) {
    filter.$and = filter.$and || [];

    filter.$and.push({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { packageName: { $regex: q, $options: "i" } },
        { priceKey: { $regex: q, $options: "i" } },
      ],
    });
  }

  return { filter, scope, q };
}

function hasAnyValue(obj: any, keys: string[]) {
  return keys.some((key) => Boolean(obj?.[key]));
}

function firstValue(obj: any, keys: string[]) {
  for (const key of keys) {
    if (obj?.[key]) return obj[key];
  }

  return null;
}

function buildMessageRounds(invitation: any) {
  const locks = invitation?.adminMessageRoundLocks || {};

  if (!invitation) {
    return {
      rsvp: [1, 2, 3].map((round) => ({
        key: `rsvp_${round}`,
        label: `אישורי הגעה סבב ${round}`,
        done: false,
        blocked: false,
        sentAt: null,
        scheduledAt: null,
      })),

      reminder: [
        {
          key: "reminder",
          label: "סבב תזכורת",
          done: false,
          blocked: false,
          sentAt: null,
          scheduledAt: null,
        },
      ],

      thankyou: [
        {
          key: "thankyou",
          label: "סבב תודה",
          done: false,
          blocked: false,
          sentAt: null,
          scheduledAt: null,
        },
      ],
    };
  }

  return {
    rsvp: [1, 2, 3].map((round) => {
      const sentKeys = [
  `rsvpRound${round}SentAt`,
  `rsvpRound${round}sentAt`,

  `rsvpSmsRound${round}SentAt`,
  `rsvpSmsRound${round}sentAt`,

  `rsvpWhatsappRound${round}SentAt`,
  `rsvpWhatsappRound${round}sentAt`,
];

      const scheduledKeys = [
  `rsvpRound${round}ScheduledAt`,
  `rsvpRound${round}scheduledAt`,

  `rsvpSmsRound${round}ScheduledAt`,
  `rsvpSmsRound${round}scheduledAt`,

  `rsvpWhatsappRound${round}ScheduledAt`,
  `rsvpWhatsappRound${round}scheduledAt`,
];

      return {
        key: `rsvp_${round}`,
        label: `אישורי הגעה סבב ${round}`,
        done: hasAnyValue(invitation, sentKeys),
        sentAt: firstValue(invitation, sentKeys),
        scheduledAt: firstValue(invitation, scheduledKeys),
        blocked: Boolean(locks?.[`rsvp_${round}`]),
      };
    }),

    reminder: [
      {
        key: "reminder",
        label: "סבב תזכורת",
        done: hasAnyValue(invitation, [
          "reminderSentAt",
          "remindersentAt",

          "reminderSmsSentAt",
          "reminderSmssentAt",

          "reminderWhatsappSentAt",
          "reminderWhatsappsentAt",
        ]),
        sentAt: firstValue(invitation, [
          "reminderSentAt",
          "remindersentAt",

          "reminderSmsSentAt",
          "reminderSmssentAt",

          "reminderWhatsappSentAt",
          "reminderWhatsappsentAt",
        ]),
        scheduledAt: firstValue(invitation, [
          "reminderScheduledAt",
          "reminderscheduledAt",

          "reminderSmsScheduledAt",
          "reminderSmsscheduledAt",

          "reminderWhatsappScheduledAt",
          "reminderWhatsappscheduledAt",
        ]),
        blocked: Boolean(locks?.reminder),
      },
    ],

    thankyou: [
      {
        key: "thankyou",
        label: "סבב תודה",
        done: hasAnyValue(invitation, [
          "thankYouSentAt",
          "thankYousentAt",
          "thankyouSentAt",
          "thankyousentAt",

          "thankYouSmsSentAt",
          "thankYouSmssentAt",
          "thankyouSmsSentAt",
          "thankyouSmssentAt",

          "thankYouWhatsappSentAt",
          "thankYouWhatsappsentAt",
          "thankyouWhatsappSentAt",
          "thankyouWhatsappsentAt",
        ]),
        sentAt: firstValue(invitation, [
          "thankYouSentAt",
          "thankYousentAt",
          "thankyouSentAt",
          "thankyousentAt",

          "thankYouSmsSentAt",
          "thankYouSmssentAt",
          "thankyouSmsSentAt",
          "thankyouSmssentAt",

          "thankYouWhatsappSentAt",
          "thankYouWhatsappsentAt",
          "thankyouWhatsappSentAt",
          "thankyouWhatsappsentAt",
        ]),
        scheduledAt: firstValue(invitation, [
          "thankYouScheduledAt",
          "thankYouscheduledAt",
          "thankyouScheduledAt",
          "thankyouscheduledAt",

          "thankYouSmsScheduledAt",
          "thankYouSmsscheduledAt",
          "thankyouSmsScheduledAt",
          "thankyouSmsscheduledAt",

          "thankYouWhatsappScheduledAt",
          "thankYouWhatsappscheduledAt",
          "thankyouWhatsappScheduledAt",
          "thankyouWhatsappscheduledAt",
        ]),
        blocked: Boolean(locks?.thankyou),
      },
    ],
  };
}

/* =========================================================
   GET – ADMIN USERS LIST
   /api/admin/users?scope=all|active&q=...
========================================================= */
export async function GET(req: Request) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req as NextRequest);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    if (!isAdminContext(auth)) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    const { filter, scope, q } = buildUsersFilter(req);

    const users = await User.find(filter)
      .select(`
        name
        email
        phone
        role
        staffType

        plan
        priceKey
        packageName

        guests
        maxGuests
        maxMessages
        smsLimit
        smsUsed

        paidAmount
        hasPaid
        isActive

        includeCalls
        callsRounds
        callsAddonPrice

        includeCreditGifts
        creditGiftsAddonPrice

        includeDigitalSeating
        includeEventManagement
        includeCustomDesign
        selfManageEnabled
        customDesignEnabled

        createdByProducer
        producerId
        planLimits

        createdAt
        eventDate

        producerPricePerRecord
        assignedProducerId
        assignedStaffIds
      `)
      .sort({ createdAt: -1 })
      .lean();

    const userIds = users.map((u: any) => u._id);

    const emails = users
      .map((u: any) => normalizeEmail(u.email))
      .filter(Boolean);

    const [invitations, paymentsAgg, totalRevenueAgg] = await Promise.all([
      userIds.length > 0
        ? Invitation.find({
            ownerId: { $in: userIds },
          })
            .select(`
              ownerId
              eventDate

              rsvpRound1SentAt
              rsvpRound2SentAt
              rsvpRound3SentAt
              rsvpRound1sentAt
              rsvpRound2sentAt
              rsvpRound3sentAt

              rsvpSmsRound1SentAt
              rsvpSmsRound2SentAt
              rsvpSmsRound3SentAt
              rsvpSmsRound1sentAt
              rsvpSmsRound2sentAt
              rsvpSmsRound3sentAt

              rsvpWhatsappRound1SentAt
              rsvpWhatsappRound2SentAt
              rsvpWhatsappRound3SentAt
              rsvpWhatsappRound1sentAt
              rsvpWhatsappRound2sentAt
              rsvpWhatsappRound3sentAt

              rsvpRound1ScheduledAt
              rsvpRound2ScheduledAt
              rsvpRound3ScheduledAt
              rsvpRound1scheduledAt
              rsvpRound2scheduledAt
              rsvpRound3scheduledAt

              rsvpSmsRound1ScheduledAt
              rsvpSmsRound2ScheduledAt
              rsvpSmsRound3ScheduledAt
              rsvpSmsRound1scheduledAt
              rsvpSmsRound2scheduledAt
              rsvpSmsRound3scheduledAt

              rsvpWhatsappRound1ScheduledAt
              rsvpWhatsappRound2ScheduledAt
              rsvpWhatsappRound3ScheduledAt
              rsvpWhatsappRound1scheduledAt
              rsvpWhatsappRound2scheduledAt
              rsvpWhatsappRound3scheduledAt

              reminderSentAt
              remindersentAt
              reminderSmsSentAt
              reminderSmssentAt
              reminderWhatsappSentAt
              reminderWhatsappsentAt
              reminderScheduledAt
              reminderscheduledAt
              reminderSmsScheduledAt
              reminderSmsscheduledAt
              reminderWhatsappScheduledAt
              reminderWhatsappscheduledAt

              thankYouSentAt
              thankYousentAt
              thankyouSentAt
              thankyousentAt
              thankYouSmsSentAt
              thankYouSmssentAt
              thankyouSmsSentAt
              thankyouSmssentAt
              thankYouWhatsappSentAt
              thankYouWhatsappsentAt
              thankyouWhatsappSentAt
              thankyouWhatsappsentAt
              thankYouScheduledAt
              thankYouscheduledAt
              thankyouScheduledAt
              thankyouscheduledAt
              thankYouSmsScheduledAt
              thankYouSmsscheduledAt
              thankyouSmsScheduledAt
              thankyouSmsscheduledAt
              thankYouWhatsappScheduledAt
              thankYouWhatsappscheduledAt
              thankyouWhatsappScheduledAt
              thankyouWhatsappscheduledAt

              messageLocks
              adminMessageRoundLocks
            `)
            .sort({ eventDate: -1 })
            .lean()
        : [],

      emails.length > 0
        ? Payment.aggregate([
            {
              $match: {
                email: { $in: emails },
                isTest: { $ne: true },
                status: {
                  $in: ["paid", "partially_refunded"],
                },
              },
            },
            {
              $project: {
                email: 1,
                createdAt: 1,
                priceKey: 1,
                maxGuests: 1,
                type: 1,
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
              $sort: {
                createdAt: -1,
              },
            },
            {
              $group: {
                _id: "$email",
                totalPaid: {
                  $sum: "$netAmount",
                },
                paymentsCount: {
                  $sum: 1,
                },
                lastPaymentAt: {
                  $first: "$createdAt",
                },
                lastPriceKey: {
                  $first: "$priceKey",
                },
                lastMaxGuests: {
                  $first: "$maxGuests",
                },
                paymentTypes: {
                  $addToSet: "$type",
                },
              },
            },
          ])
        : [],

      Payment.aggregate([
        {
          $match: {
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
    ]);

    const paymentByEmail = new Map<string, any>();

    paymentsAgg.forEach((payment: any) => {
      if (payment?._id) {
        paymentByEmail.set(normalizeEmail(payment._id), payment);
      }
    });

    const invitationByUserId = new Map<string, any>();

    for (const invitation of invitations) {
      const uid = String(invitation.ownerId);

      if (!invitationByUserId.has(uid)) {
        invitationByUserId.set(uid, invitation);
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usersWithEventDate = users
      .map((u: any) => {
        const email = normalizeEmail(u.email);
        const payment = paymentByEmail.get(email);
        const invitation = invitationByUserId.get(String(u._id));

        const planKey =
          u.priceKey ||
          u.plan ||
          payment?.lastPriceKey ||
          "plan1";

        const planData = getPlanConfig(planKey);

        const includeDigitalSeating =
          Boolean(u.includeDigitalSeating) ||
          Boolean(u.planLimits?.seatingEnabled);

        const includeEventManagement =
          Boolean(u.includeEventManagement) ||
          Boolean(u.selfManageEnabled);

        const includeCustomDesign =
          Boolean(u.includeCustomDesign) ||
          Boolean(u.customDesignEnabled);

        const guests = Number(
          u.guests ||
            u.maxGuests ||
            u.planLimits?.maxGuests ||
            payment?.lastMaxGuests ||
            planData.guests ||
            0
        );

        const smsLimit = Number(
          u.smsLimit ||
            u.maxMessages ||
            u.planLimits?.smsLimit ||
            planData.sms ||
            0
        );

        return {
          ...u,

          plan: u.plan || planKey,
          priceKey: u.priceKey || planKey,
          packageName: u.packageName || planData.label,

          guests,
          maxGuests: Number(u.maxGuests || guests),

          smsLimit,
          maxMessages: Number(u.maxMessages || smsLimit),

          includeCalls: Boolean(u.includeCalls),
          callsRounds: Number(u.callsRounds || 0),
          callsAddonPrice: Number(u.callsAddonPrice || 0),

          includeCreditGifts: Boolean(u.includeCreditGifts),
          creditGiftsAddonPrice: Number(u.creditGiftsAddonPrice || 0),

          includeDigitalSeating,
          includeEventManagement,
          includeCustomDesign,

          totalPaid: Number(payment?.totalPaid || u.paidAmount || 0),
          paymentsCount: Number(payment?.paymentsCount || 0),
          lastPaymentAt: payment?.lastPaymentAt || null,
          paymentTypes: payment?.paymentTypes || [],
          invitationId: invitation?._id ? String(invitation._id) : null,


          eventDate: u.eventDate || invitation?.eventDate || null,

          messageRounds: buildMessageRounds(invitation),
        };
      })
      .sort((a: any, b: any) => {
        if (!a.eventDate) return 1;
        if (!b.eventDate) return -1;

        const dateA = new Date(a.eventDate);
        const dateB = new Date(b.eventDate);

        dateA.setHours(0, 0, 0, 0);
        dateB.setHours(0, 0, 0, 0);

        const isPastA = dateA < today;
        const isPastB = dateB < today;

        if (isPastA && !isPastB) return 1;
        if (!isPastA && isPastB) return -1;

        if (!isPastA && !isPastB) {
          return dateA.getTime() - dateB.getTime();
        }

        return dateB.getTime() - dateA.getTime();
      });

    return NextResponse.json(
      {
        success: true,
        users: usersWithEventDate,
        totalRevenue: Number(totalRevenueAgg[0]?.totalRevenue || 0),
        meta: {
          scope,
          q,
          count: usersWithEventDate.length,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("❌ ADMIN USERS GET ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST – CREATE USER (ADMIN)
========================================================= */
export async function POST(req: Request) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req as NextRequest);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    if (!isAdminContext(auth)) {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);

    const {
      name,
      email,
      role,
      limits,
      billing,
      addons,
      plan,
    } = body || {};

    if (!name || !email || !role) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_REQUIRED_FIELDS",
        },
        { status: 400 }
      );
    }

    const safeEmail = normalizeEmail(email);

    const existing = await User.findOne({
      email: safeEmail,
    })
      .select("_id")
      .lean();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "EMAIL_ALREADY_EXISTS",
        },
        { status: 409 }
      );
    }

    /* =========================
       PRODUCER
    ========================= */
    if (role === "producer") {
      const pricePerRecord = Number(billing?.pricePerRecord || 0);

      const user = await User.create({
        name,
        email: safeEmail,
        role: "producer",

        producerPricePerRecord: pricePerRecord,

        hasPaid: true,
        paidAmount: 0,
        isActive: true,

        needsPasswordSetup: true,
        createdByAdmin: true,
        billingSource: "admin",
      });

      await sendPasswordSetupMail(String(user._id));

      return NextResponse.json(
        {
          success: true,
          userId: String(user._id),
        },
        { status: 201 }
      );
    }

    /* =========================
       STAFF
    ========================= */
    if (role === "staff") {
      const user = await User.create({
        name,
        email: safeEmail,
        role: "staff",

        hasPaid: true,
        paidAmount: 0,
        isActive: true,

        needsPasswordSetup: true,
        createdByAdmin: true,
        billingSource: "admin",
      });

      await sendPasswordSetupMail(String(user._id));

      return NextResponse.json(
        {
          success: true,
          userId: String(user._id),
        },
        { status: 201 }
      );
    }

    /* =========================
       REGULAR USER
    ========================= */
    const selectedPlanKey = String(plan || "plan1");
    const planData = getPlanConfig(selectedPlanKey);

    const recordsNum = Number(limits?.records || planData.guests || 0);
    const smsTotalNum = Number(limits?.smsTotal || planData.sms || 0);
    const priceNum = Number(billing?.price ?? planData.price ?? 0);

    if (
      Number.isNaN(recordsNum) ||
      Number.isNaN(smsTotalNum) ||
      Number.isNaN(priceNum)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_LIMITS_OR_BILLING",
        },
        { status: 400 }
      );
    }

    const finalIncludeCalls =
      Boolean(planData.includeCalls) ||
      Boolean(limits?.includeCalls) ||
      Boolean(addons?.calls?.enabled);

    const finalIncludeCreditGifts =
      Boolean(planData.includeCreditGifts) ||
      Boolean(addons?.credit?.enabled);

    const finalDigitalSeating =
      Boolean(planData.includeDigitalSeating) ||
      Boolean(addons?.seating?.enabled);

    const finalEventManagement =
      Boolean(planData.includeEventManagement) ||
      Boolean(addons?.system?.enabled);

    const finalCustomDesign = Boolean(addons?.design?.enabled);

    const planLimits = {
      maxGuests: recordsNum,
      smsEnabled: true,
      smsLimit: smsTotalNum,
      seatingEnabled: finalDigitalSeating,
      remindersEnabled: true,
      callsEnabled: finalIncludeCalls,
    };

    const paymentStatus = billing?.paymentStatus || "paid";
    const hasPaid = paymentStatus === "paid";

    const user = await User.create({
      name,
      email: safeEmail,
      role: "user",

      plan: selectedPlanKey,
      priceKey: selectedPlanKey,
      packageName: planData.label,

      planLimits,

      guests: recordsNum,
      maxGuests: recordsNum,

      maxMessages: smsTotalNum,
      smsLimit: smsTotalNum,

      includeCalls: finalIncludeCalls,
      callsRounds: finalIncludeCalls ? 3 : 0,
      callsAddonPrice: Number(addons?.calls?.price || 0),

      includeCreditGifts: finalIncludeCreditGifts,
      creditGiftsAddonPrice: Number(addons?.credit?.price || 0),

      includeDigitalSeating: finalDigitalSeating,
      includeEventManagement: finalEventManagement,
      includeCustomDesign: finalCustomDesign,

      selfManageEnabled: finalEventManagement,
      customDesignEnabled: finalCustomDesign,

      hasPaid,
      paidAmount: hasPaid ? priceNum : 0,
      isActive: hasPaid,

      needsPasswordSetup: true,
      createdByAdmin: true,
      billingSource: "admin",
    });

    if (hasPaid && priceNum > 0) {
      await Payment.create({
        email: safeEmail,

        stripeSessionId: undefined,
        stripePaymentIntentId: undefined,
        stripeCustomerId: undefined,
        stripePriceId: undefined,

        priceKey: selectedPlanKey,
        maxGuests: recordsNum,

        includeCalls: finalIncludeCalls,
        callsAddonPrice: Number(addons?.calls?.price || 0),

        includeCreditGifts: finalIncludeCreditGifts,
        creditGiftsAddonPrice: Number(addons?.credit?.price || 0),

        amount: priceNum,
        refundAmount: 0,
        currency: "ils",

        type: "package",
        status: "paid",
        isTest: false,

        meta: {
          source: "admin",
          adminId: auth.impersonatedBy
            ? String(auth.impersonatedBy)
            : String(auth.userId),
          userId: String(user._id),
          plan: selectedPlanKey,
          packageName: planData.label,
          includeDigitalSeating: finalDigitalSeating,
          includeEventManagement: finalEventManagement,
          includeCustomDesign: finalCustomDesign,
        },
      });
    }

    await sendPasswordSetupMail(String(user._id));

    return NextResponse.json(
      {
        success: true,
        userId: String(user._id),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("🔥 ADMIN USERS POST ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}