import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Payment from "@/models/Payment";
import Invitation from "@/models/Invitation";
import ScheduledMessage from "@/models/ScheduledMessage";
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
    price: number;
    allowedMessageRounds: 2 | 3;
    includeCalls: boolean;
    includeCreditGifts: boolean;
    includeDigitalSeating: boolean;
    includeEventManagement: boolean;
  }
> = {
  plan1: {
    label: "חבילה 1",
    guests: 100,
    price: 402,
    allowedMessageRounds: 2,
    includeCalls: false,
    includeCreditGifts: false,
    includeDigitalSeating: false,
    includeEventManagement: false,
  },

  plan2: {
    label: "חבילה 2",
    guests: 200,
    price: 789,
    allowedMessageRounds: 2,
    includeCalls: true,
    includeCreditGifts: false,
    includeDigitalSeating: false,
    includeEventManagement: false,
  },

  plan3: {
    label: "חבילה 3",
    guests: 300,
    price: 1171,
    allowedMessageRounds: 2,
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

function normalizeString(value?: unknown) {
  return String(value || "").trim();
}

function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy
  );
}

function normalizeAllowedMessageRounds(value: any): 2 | 3 {
  return Number(value) === 3 ? 3 : 2;
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
      { priceKey: "venue_owner_manual" },
      { createdByProducer: { $ne: null } },
      { role: "producer" },
      { role: "staff" },
      { role: "venue_owner" },
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
        { role: { $regex: q, $options: "i" } },
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

function sameId(a: any, b: any) {
  if (!a || !b) return false;
  return String(a) === String(b);
}

function isScheduledStatus(msg: any) {
  return String(msg?.status || "").toLowerCase() === "scheduled";
}

function findScheduledMessage(
  scheduledMessages: any[],
  params: {
    invitationId?: any;
    userId?: any;
    type?: string;
    templateKeys?: string[];
    roundNumber?: number;
  }
) {
  const wantedType = String(params.type || "").toLowerCase();
  const wantedTemplateKeys = (params.templateKeys || []).map((key) =>
    String(key || "").toLowerCase()
  );

  return scheduledMessages.find((msg) => {
    if (!isScheduledStatus(msg)) return false;

    const sameInvitation =
      params.invitationId && msg?.invitationId
        ? sameId(msg.invitationId, params.invitationId)
        : true;

    const sameUser =
      params.userId && msg?.userId ? sameId(msg.userId, params.userId) : true;

    if (!sameInvitation || !sameUser) return false;

    const msgType = String(msg?.type || "").toLowerCase();
    const msgTemplateKey = String(
      msg?.templateKey || msg?.templateName || ""
    ).toLowerCase();

    const matchesType = wantedType ? msgType === wantedType : true;

    const matchesTemplate =
      wantedTemplateKeys.length === 0 ||
      wantedTemplateKeys.includes(msgTemplateKey);

    const matchesRound =
      typeof params.roundNumber !== "number" ||
      Number(msg?.roundNumber || msg?.round || 0) === Number(params.roundNumber);

    return matchesType && matchesTemplate && matchesRound;
  });
}

function buildMessageRounds(invitation: any, scheduledMessages: any[] = []) {
  const locks = invitation?.adminMessageRoundLocks || {};
  const rsvpRounds = [1, 2, 3];

  if (!invitation) {
    return {
      rsvp: rsvpRounds.map((round) => ({
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

  const invitationId = invitation?._id;
  const userId = invitation?.ownerId;

  return {
    rsvp: rsvpRounds.map((round) => {
      const roundData = invitation?.rsvpRoundSent?.[`round${round}`];

      const scheduledMessage = findScheduledMessage(scheduledMessages, {
        invitationId,
        userId,
        type: "rsvp",
        templateKeys: ["rsvp", "rsvp_invitation_media"],
        roundNumber: round,
      });

      const sentAt =
        roundData?.sentAt ||
        roundData?.sentAtSms ||
        roundData?.sentAtWhatsapp ||
        roundData?.smsSentAt ||
        roundData?.whatsappSentAt ||
        invitation?.[`rsvpRound${round}SentAt`] ||
        invitation?.[`rsvpRound${round}sentAt`] ||
        invitation?.[`rsvpSmsRound${round}SentAt`] ||
        invitation?.[`rsvpSmsRound${round}sentAt`] ||
        invitation?.[`rsvpWhatsappRound${round}SentAt`] ||
        invitation?.[`rsvpWhatsappRound${round}sentAt`] ||
        null;

      const scheduledAt =
        roundData?.scheduledAt ||
        roundData?.smsScheduledAt ||
        roundData?.whatsappScheduledAt ||
        invitation?.[`rsvpRound${round}ScheduledAt`] ||
        invitation?.[`rsvpRound${round}scheduledAt`] ||
        invitation?.[`rsvpSmsRound${round}ScheduledAt`] ||
        invitation?.[`rsvpSmsRound${round}scheduledAt`] ||
        invitation?.[`rsvpWhatsappRound${round}ScheduledAt`] ||
        invitation?.[`rsvpWhatsappRound${round}scheduledAt`] ||
        scheduledMessage?.scheduledAt ||
        null;

      return {
        key: `rsvp_${round}`,
        label: `אישורי הגעה סבב ${round}`,
        done: Boolean(sentAt),
        sentAt,
        scheduledAt,
        blocked: Boolean(locks?.[`rsvp_${round}`]),
      };
    }),

    reminder: [
      (() => {
        const scheduledMessage = findScheduledMessage(scheduledMessages, {
          invitationId,
          userId,
          type: "reminder",
          templateKeys: ["reminder", "table", "rsvp_reminder_invistimo"],
        });

        const sentAt = firstValue(invitation, [
          "reminderSentAt",
          "remindersentAt",
          "reminderSmsSentAt",
          "reminderSmssentAt",
          "reminderWhatsappSentAt",
          "reminderWhatsappsentAt",
        ]);

        const scheduledAt =
          firstValue(invitation, [
            "reminderScheduledAt",
            "reminderscheduledAt",
            "reminderSmsScheduledAt",
            "reminderSmsscheduledAt",
            "reminderWhatsappScheduledAt",
            "reminderWhatsappscheduledAt",
          ]) ||
          scheduledMessage?.scheduledAt ||
          null;

        return {
          key: "reminder",
          label: "סבב תזכורת",
          done: Boolean(sentAt),
          sentAt,
          scheduledAt,
          blocked: Boolean(locks?.reminder),
        };
      })(),
    ],

    thankyou: [
      (() => {
        const scheduledMessage = findScheduledMessage(scheduledMessages, {
          invitationId,
          userId,
          type: "thankyou",
          templateKeys: ["thankyou", "thank_you", "thank_you_message"],
        });

        const sentAt = firstValue(invitation, [
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
        ]);

        const scheduledAt =
          firstValue(invitation, [
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
          ]) ||
          scheduledMessage?.scheduledAt ||
          null;

        return {
          key: "thankyou",
          label: "סבב תודה",
          done: Boolean(sentAt),
          sentAt,
          scheduledAt,
          blocked: Boolean(locks?.thankyou),
        };
      })(),
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

        allowedMessageRounds
        venueSeatingService

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
        accessModules
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

    const [invitations, scheduledMessages, paymentsAgg, totalRevenueAgg] = await Promise.all([
      userIds.length > 0
        ? Invitation.find({
            ownerId: { $in: userIds },
          })
            .select(`
              ownerId
              eventDate
              rsvpRoundSent

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

      userIds.length > 0
        ? ScheduledMessage.find({
            userId: { $in: userIds },
            status: "scheduled",
          })
            .select(`
              userId
              invitationId
              channel
              type
              filter
              templateKey
              templateName
              round
              roundNumber
              scheduledAt
              status
            `)
            .sort({ scheduledAt: 1 })
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

        const isVenueOwner = u.role === "venue_owner";

        if (isVenueOwner) {
          return {
            ...u,

            plan: u.plan || "basic",
            priceKey: u.priceKey || "venue_owner_manual",
            packageName: u.packageName || "ניהול אולם",

            guests: Number(u.guests || 0),
            maxGuests: Number(u.maxGuests || 0),

            allowedMessageRounds: 2,

            includeCalls: false,
            callsRounds: 0,
            callsAddonPrice: 0,

            includeCreditGifts: false,
            creditGiftsAddonPrice: 0,

            includeDigitalSeating: false,
            includeEventManagement: false,
            includeCustomDesign: false,

            accessModules: {
              rsvpSeating: false,
              eventProduction: false,
              venueDashboard: true,
            },

            totalPaid: Number(payment?.totalPaid || u.paidAmount || 0),
            paymentsCount: Number(payment?.paymentsCount || 0),
            lastPaymentAt: payment?.lastPaymentAt || null,
            paymentTypes: payment?.paymentTypes || [],

            invitationId: null,
            eventDate: u.eventDate || null,

            messageRounds: buildMessageRounds(null, []),
          };
        }

        const planKey =
          u.priceKey ||
          u.plan ||
          payment?.lastPriceKey ||
          "plan1";

        const planData = getPlanConfig(planKey);

        const includeDigitalSeating =
          Boolean(u.accessModules?.rsvpSeating) ||
          Boolean(u.includeDigitalSeating) ||
          Boolean(u.planLimits?.seatingEnabled);

        const includeEventManagement =
          Boolean(u.accessModules?.eventProduction) ||
          Boolean(u.includeEventManagement) ||
          Boolean(u.selfManageEnabled);

        const includeCustomDesign =
          Boolean(u.includeCustomDesign) ||
          Boolean(u.customDesignEnabled);

        const accessModules = {
          rsvpSeating: Boolean(
            u.accessModules?.rsvpSeating ?? includeDigitalSeating
          ),
          eventProduction: Boolean(
            u.accessModules?.eventProduction ?? includeEventManagement
          ),
        };

        const guests = Number(
          u.guests ||
            u.maxGuests ||
            u.planLimits?.maxGuests ||
            payment?.lastMaxGuests ||
            planData.guests ||
            0
        );

        const allowedMessageRounds = normalizeAllowedMessageRounds(
          u.allowedMessageRounds ||
            u.planLimits?.allowedMessageRounds ||
            planData.allowedMessageRounds
        );

        return {
          ...u,

          plan: u.plan || planKey,
          priceKey: u.priceKey || planKey,
          packageName: u.packageName || planData.label,

          guests,
          maxGuests: Number(u.maxGuests || guests),

          allowedMessageRounds,

          includeCalls: Boolean(u.includeCalls),
          callsRounds: Number(u.callsRounds || 0),
          callsAddonPrice: Number(u.callsAddonPrice || 0),

          includeCreditGifts: Boolean(u.includeCreditGifts),
          creditGiftsAddonPrice: Number(u.creditGiftsAddonPrice || 0),

          includeDigitalSeating,
          includeEventManagement,
          includeCustomDesign,

          accessModules,

          totalPaid: Number(payment?.totalPaid || u.paidAmount || 0),
          paymentsCount: Number(payment?.paymentsCount || 0),
          lastPaymentAt: payment?.lastPaymentAt || null,
          paymentTypes: payment?.paymentTypes || [],
          invitationId: invitation?._id ? String(invitation._id) : null,

          eventDate: u.eventDate || invitation?.eventDate || null,

          messageRounds: buildMessageRounds(invitation, scheduledMessages),
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
      accessModules,
    } = body || {};

    const safeName = normalizeString(name);
    const safeEmail = normalizeEmail(email);
    const safeRole = normalizeString(role);

    if (!safeName || !safeEmail || !safeRole) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_REQUIRED_FIELDS",
        },
        { status: 400 }
      );
    }

    const allowedRoles = ["user", "producer", "staff", "venue_owner"];

    if (!allowedRoles.includes(safeRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_ROLE",
        },
        { status: 400 }
      );
    }

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
       VENUE OWNER
    ========================= */
    if (safeRole === "venue_owner") {
      const user = await User.create({
        name: safeName,
        email: safeEmail,
        role: "venue_owner",

        plan: "basic",
        priceKey: "venue_owner_manual",
        packageName: "ניהול אולם",

        guests: 0,
        maxGuests: 0,

        allowedMessageRounds: 2,

        maxMessages: 0,
        smsLimit: 0,
        smsUsed: 0,

        includeCalls: false,
        callsRounds: 0,
        callsAddonPrice: 0,

        includeCreditGifts: false,
        creditGiftsAddonPrice: 0,

        includeDigitalSeating: false,
        includeEventManagement: false,
        includeCustomDesign: false,

        accessModules: {
          rsvpSeating: false,
          eventProduction: false,
          venueDashboard: true,
        },

        planLimits: {
          maxGuests: 0,
          allowedMessageRounds: 2,
          smsEnabled: false,
          smsLimit: 0,
          seatingEnabled: false,
          remindersEnabled: false,
          callsEnabled: false,
        },

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
          role: "venue_owner",
        },
        { status: 201 }
      );
    }

    /* =========================
       PRODUCER
    ========================= */
    if (safeRole === "producer") {
      const pricePerRecord = Number(billing?.pricePerRecord || 0);

      const user = await User.create({
        name: safeName,
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
          role: "producer",
        },
        { status: 201 }
      );
    }

    /* =========================
       STAFF
    ========================= */
    if (safeRole === "staff") {
      const user = await User.create({
        name: safeName,
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
          role: "staff",
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

    const allowedMessageRounds = normalizeAllowedMessageRounds(
      limits?.allowedMessageRounds ??
        body?.allowedMessageRounds ??
        planData.allowedMessageRounds
    );

    const priceNum = Number(billing?.price ?? planData.price ?? 0);

    if (
      Number.isNaN(recordsNum) ||
      recordsNum <= 0 ||
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

    /*
      הרשאות מודולים:
      rsvpSeating = אישורי הגעה / הושבה
      eventProduction = הפקת אירוע
    */
    const finalAccessModules = {
      rsvpSeating:
        typeof accessModules?.rsvpSeating === "boolean"
          ? accessModules.rsvpSeating
          : finalDigitalSeating,

      eventProduction:
        typeof accessModules?.eventProduction === "boolean"
          ? accessModules.eventProduction
          : finalEventManagement,
    };

    const planLimits = {
      maxGuests: recordsNum,

      /*
        ✅ חדש:
        לא מגבילים לפי כמות הודעות.
        2 = כלול בחבילה
        3 = פתוח ללקוח אם נבחר בדרופדאון / או נפתח ידנית באדמין
      */
      allowedMessageRounds,

      // נשארים רק לתאימות עם המודל/קוד ישן
      smsEnabled: false,
      smsLimit: 0,

      seatingEnabled: finalAccessModules.rsvpSeating,
      remindersEnabled: true,
      callsEnabled: finalIncludeCalls,
    };

    const paymentStatus = billing?.paymentStatus || "paid";
    const hasPaid = paymentStatus === "paid";

    const user = await User.create({
      name: safeName,
      email: safeEmail,
      role: "user",

      plan: selectedPlanKey,
      priceKey: selectedPlanKey,
      packageName: planData.label,

      planLimits,

      guests: recordsNum,
      maxGuests: recordsNum,

      /*
        ✅ חדש:
        שמירה גם כשדה ישיר על המשתמש,
        כדי שיהיה קל לבדוק בפרונט / API אחרים.
      */
      allowedMessageRounds,

      /*
        ⚠️ נשארים 0 רק כדי לא לשבור מקומות ישנים בקוד
        אם עדיין יש select/תצוגות שמצפות לשדות האלה.
        הלוגיקה החדשה לא משתמשת בהם.
      */
      maxMessages: 0,
      smsLimit: 0,

      includeCalls: finalIncludeCalls,
      callsRounds: finalIncludeCalls ? 3 : 0,
      callsAddonPrice: Number(addons?.calls?.price || 0),

      includeCreditGifts: finalIncludeCreditGifts,
      creditGiftsAddonPrice: Number(addons?.credit?.price || 0),

      includeDigitalSeating: finalAccessModules.rsvpSeating,
      includeEventManagement: finalAccessModules.eventProduction,
      includeCustomDesign: finalCustomDesign,

      accessModules: finalAccessModules,

      selfManageEnabled: finalAccessModules.eventProduction,
      customDesignEnabled: finalCustomDesign,

      venueSeatingService: body?.venueSeatingService || undefined,

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

          maxGuests: recordsNum,
          allowedMessageRounds,

          includeDigitalSeating: finalAccessModules.rsvpSeating,
          includeEventManagement: finalAccessModules.eventProduction,
          includeCustomDesign: finalCustomDesign,

          accessModules: finalAccessModules,
        },
      });
    }

    await sendPasswordSetupMail(String(user._id));

    return NextResponse.json(
      {
        success: true,
        userId: String(user._id),
        role: "user",
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