import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import User from "@/models/User";
import Payment from "@/models/Payment";
import Invitation from "@/models/Invitation";
import ScheduledMessage from "@/models/ScheduledMessage";
import { sendPasswordSetupMail } from "@/lib/sendPasswordSetupMail";
import { guestExperienceFromRsvpSiteMode, normalizeRsvpSiteMode } from "@/types/rsvpSite";
import {
  ensurePreRsvpInvitationGrant,
  readPreRsvpFlags,
} from "@/lib/preRsvp/entitlement";
import {
  getRsvpRoundSentSnapshot,
  type RsvpRound,
} from "@/lib/rsvpRoundLock";

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

function serializePasswordSetup(
  passwordSetup: Awaited<ReturnType<typeof sendPasswordSetupMail>> | null,
) {
  if (!passwordSetup) {
    return {
      link: null,
      email: "",
      phone: "",
      emailSent: false,
      smsSent: false,
      emailError: "PASSWORD_SETUP_DELIVERY_FAILED",
      smsError: null as string | null,
    };
  }

  return {
    link: passwordSetup.link,
    email: passwordSetup.email,
    phone: passwordSetup.phone,
    emailSent: passwordSetup.emailSent,
    smsSent: passwordSetup.smsSent,
    emailError: passwordSetup.emailError || null,
    smsError: passwordSetup.smsError || null,
  };
}

async function deliverPasswordSetup(userId: string) {
  try {
    return await sendPasswordSetupMail(userId);
  } catch (err) {
    console.error("SEND PASSWORD SETUP MAIL FAILED:", err);
    return null;
  }
}

const CREATE_USER_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "יש להתחבר מחדש",
  FORBIDDEN: "אין הרשאה ליצירת משתמש",
  MISSING_REQUIRED_FIELDS: "חסרים שם, אימייל או סוג משתמש",
  INVALID_ROLE: "סוג משתמש לא תקין",
  EMAIL_ALREADY_EXISTS: "האימייל כבר קיים במערכת",
  ASSIGNED_PRODUCER_REQUIRED: "חסר מזהה מפיק עבור עובד מפיק",
  INVALID_LIMITS_OR_BILLING: "נתוני תמחור או מגבלות לא תקינים",
  SERVER_ERROR: "שגיאת שרת ביצירת משתמש",
};

function jsonError(error: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error,
      message: CREATE_USER_ERROR_MESSAGES[error] || error,
    },
    { status },
  );
}

function isAdminContext(auth: any) {
  return (
    auth?.role === "admin" ||
    auth?.impersonationRole === "admin" ||
    !!auth?.impersonatedBy ||
    (
      auth?.role === "staff" &&
      auth?.staffType === "general_staff" &&
      auth?.employeeScope === "system"
    )
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
    types?: string[];
    templateKeys?: string[];
    roundNumber?: number;
  }
) {
  const wantedTypes = [
    ...(params.type ? [params.type] : []),
    ...(params.types || []),
  ]
    .map((key) => String(key || "").toLowerCase())
    .filter(Boolean);

  const wantedTemplateKeys = (params.templateKeys || []).map((key) =>
    String(key || "").toLowerCase()
  );

  return scheduledMessages.find((msg) => {
    if (!isScheduledStatus(msg)) return false;

    const hasInvitationFilter = Boolean(params.invitationId);
    const hasUserFilter = Boolean(params.userId);

    const sameInvitation =
      hasInvitationFilter && msg?.invitationId
        ? sameId(msg.invitationId, params.invitationId)
        : false;

    const sameUser =
      hasUserFilter && msg?.userId ? sameId(msg.userId, params.userId) : false;

    if (hasInvitationFilter || hasUserFilter) {
      if (!sameInvitation && !sameUser) return false;
    }

    const msgType = String(msg?.type || "").toLowerCase();

    const msgTemplateKey = String(
      msg?.templateKey || msg?.templateName || ""
    ).toLowerCase();

    const hasTypeFilter = wantedTypes.length > 0;
const hasTemplateFilter = wantedTemplateKeys.length > 0;

const matchesType = hasTypeFilter && wantedTypes.includes(msgType);

const matchesTemplate =
  hasTemplateFilter && wantedTemplateKeys.includes(msgTemplateKey);

const matchesKind =
  hasTypeFilter && hasTemplateFilter
    ? matchesType || matchesTemplate
    : hasTypeFilter
      ? matchesType
      : hasTemplateFilter
        ? matchesTemplate
        : true;

const matchesRound =
  typeof params.roundNumber !== "number" ||
  Number(msg?.roundNumber || msg?.round || 0) === Number(params.roundNumber);

return matchesKind && matchesRound;
  });
}

function normalizeCallRoundsSchedule(rawSchedule: any, enabled: boolean) {
  const now = new Date();

  const rounds = Array.isArray(rawSchedule?.rounds)
    ? rawSchedule.rounds
        .filter((round: any) => round?.scheduledAt)
        .map((round: any) => {
          const roundNumber = Number(round.roundNumber);

          return {
            roundNumber,
            title: round.title || `סבב שיחות ${roundNumber}`,
            scheduledAt: new Date(round.scheduledAt),
            status: round.status || "scheduled",
            notes: round.notes || "",
            createdAt: round.createdAt ? new Date(round.createdAt) : now,
            updatedAt: now,
          };
        })
        .filter((round: any) => round.roundNumber >= 1 && round.roundNumber <= 3)
    : [];

  return {
    enabled: Boolean(enabled && (rawSchedule?.enabled || rounds.length > 0)),
    rounds,
  };
}

function buildMessageRounds(
  invitation: any,
  scheduledMessages: any[] = [],
  user: any = null
) {
  const locks = invitation?.adminMessageRoundLocks || {};
  const rsvpRounds: RsvpRound[] = [1, 2, 3];
  const callRounds = [1, 2, 3];

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

      calls: callRounds.map((round) => {
        const userRound = user?.callRoundsSchedule?.rounds?.find(
          (item: any) => Number(item.roundNumber) === Number(round)
        );

        return {
          key: `call_round_${round}`,
          label: `סבב שיחות ${round}`,
          done: userRound?.status === "done",
          blocked: false,
          sentAt: null,
          scheduledAt: userRound?.scheduledAt || null,
          channel: "calls",
        };
      }),
    };
  }

  const invitationId = invitation?._id;
  const userId = invitation?.ownerId;

  return {
    rsvp: rsvpRounds.map((round) => {
      const roundSnapshot = getRsvpRoundSentSnapshot(invitation, round);

      const scheduledMessage = findScheduledMessage(scheduledMessages, {
        invitationId,
        userId,
        types: ["rsvp"],
        templateKeys: ["rsvp", "rsvp_invitation_media"],
        roundNumber: round,
      });

      const scheduledAt =
        invitation?.rsvpRoundSent?.[`round${round}`]?.scheduledAt ||
        invitation?.rsvpRoundSent?.[`round${round}`]?.smsScheduledAt ||
        invitation?.rsvpRoundSent?.[`round${round}`]?.whatsappScheduledAt ||
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
        done: roundSnapshot.done,
        sentAt: roundSnapshot.sentAt,
        scheduledAt,
        channel: roundSnapshot.channel || scheduledMessage?.channel || null,
        blocked: Boolean(locks?.[`rsvp_${round}`]),
      };
    }),

    reminder: [
      (() => {
        const scheduledMessage = findScheduledMessage(scheduledMessages, {
          invitationId,
          userId,
          types: ["reminder", "table", "rsvp_reminder"],
          templateKeys: [
            "reminder",
            "table",
            "rsvp_reminder_invistimo",
            "rsvp_reminder",
          ],
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
          channel: scheduledMessage?.channel || null,
          blocked: Boolean(locks?.reminder),
        };
      })(),
    ],

    thankyou: [
      (() => {
        const scheduledMessage = findScheduledMessage(scheduledMessages, {
  invitationId,
  userId,
  types: [
    "thankyou",
    "thank_you",
    "thank-you",
    "thanks",
    "thankyou_message",
    "thank_you_message",
  ],
  templateKeys: [
    "custom",
    "thankyou",
    "thank_you",
    "thank-you",
    "thanks",
    "thankyou_message",
    "thank_you_message",
    "thanks_message",
  ],
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
          channel: scheduledMessage?.channel || null,
          blocked: Boolean(locks?.thankyou),
        };
      })(),
    ],

    calls: callRounds.map((round) => {
      const userRound = user?.callRoundsSchedule?.rounds?.find(
        (item: any) => Number(item.roundNumber) === Number(round)
      );

      const scheduledMessage = findScheduledMessage(scheduledMessages, {
        invitationId,
        userId,
        types: ["call_round", "calls", "phone_calls"],
        templateKeys: ["call_round", "calls", "phone_calls"],
        roundNumber: round,
      });

      const scheduledAt =
        userRound?.scheduledAt ||
        scheduledMessage?.scheduledAt ||
        null;

      return {
        key: `call_round_${round}`,
        label: `סבב שיחות ${round}`,
        done: userRound?.status === "done",
        sentAt: null,
        scheduledAt,
        channel: "calls",
        blocked: Boolean(locks?.[`call_round_${round}`]),
      };
    }),
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
employeeScope

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
        callRoundsSchedule

        includeCreditGifts
        creditGiftsAddonPrice

        includeDigitalSeating
        includeEventManagement
        includeCustomDesign
        includeTransportationManagement
        accessModules
        selfManageEnabled
        customDesignEnabled
        rsvpSiteMode
        guestExperienceType
        features
        salesUpsells.preRsvpMessages
        salesUpsells.transportationManagement

        createdByProducer
        producerId
        planLimits

        createdAt
        eventDate
        termsAcceptedAt
        onboardingAgreementToken
        onboardingAgreementSignedAt

        producerPricePerRecord
        assignedProducerId
        assignedProducerIds
        assignedStaffIds
      `)
      .sort({ createdAt: -1 })
      .lean();

    for (const u of users as any[]) {
      const granted = await ensurePreRsvpInvitationGrant(u);
      if (!u.salesUpsells) u.salesUpsells = {};
      u.salesUpsells.preRsvpMessages = {
        ...(u.salesUpsells.preRsvpMessages || {}),
        ...granted,
      };
    }

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
              userId
              title
              shareId
              eventDate
              createdAt
              updatedAt
              rsvpRoundSent
              rsvpRoundsSent

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
            .sort({ eventDate: -1, updatedAt: -1, createdAt: -1 })
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

    const invitationIds = Array.isArray(invitations)
      ? invitations.map((inv: any) => inv._id).filter(Boolean)
      : [];

    const scheduledMessages =
      userIds.length > 0 || invitationIds.length > 0
        ? await ScheduledMessage.find({
            status: "scheduled",
            $or: [
              ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
              ...(invitationIds.length > 0
                ? [{ invitationId: { $in: invitationIds } }]
                : []),
            ],
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
        : [];

    const paymentByEmail = new Map<string, any>();

    paymentsAgg.forEach((payment: any) => {
      if (payment?._id) {
        paymentByEmail.set(normalizeEmail(payment._id), payment);
      }
    });

    const invitationByUserId = new Map<string, any>();

    const invitationHasRoundSend = (invitation: any) => {
      return ([1, 2, 3] as RsvpRound[]).some((round) =>
        getRsvpRoundSentSnapshot(invitation, round).done
      );
    };

    const invitationScore = (invitation: any, userEventDate?: any) => {
      const eventTime = invitation?.eventDate
        ? new Date(invitation.eventDate).getTime()
        : 0;
      const updatedTime = invitation?.updatedAt
        ? new Date(invitation.updatedAt).getTime()
        : invitation?.createdAt
          ? new Date(invitation.createdAt).getTime()
          : 0;

      const userEventTime = userEventDate
        ? new Date(userEventDate).getTime()
        : 0;

      const sameEventDay =
        Number.isFinite(eventTime) &&
        Number.isFinite(userEventTime) &&
        eventTime > 0 &&
        userEventTime > 0 &&
        Math.abs(eventTime - userEventTime) < 48 * 60 * 60 * 1000;

      return (
        (invitationHasRoundSend(invitation) ? 1e15 : 0) +
        (sameEventDay ? 1e14 : 0) +
        (Number.isFinite(eventTime) ? eventTime : 0) * 10 +
        (Number.isFinite(updatedTime) ? updatedTime : 0)
      );
    };

    for (const invitation of invitations) {
      const uid = invitation.ownerId ? String(invitation.ownerId) : "";
      if (!uid) continue;

      const current = invitationByUserId.get(uid);
      const user = users.find((item: any) => String(item._id) === uid);
      const score = invitationScore(invitation, user?.eventDate);
      const currentScore = current
        ? invitationScore(current, user?.eventDate)
        : -1;

      if (!current || score > currentScore) {
        invitationByUserId.set(uid, invitation);
      }
    }

    /*
      סנכרון תאריך אירוע מההזמנה ל-User,
      כדי שבאדמין ובמסננים יוצג תמיד התאריך האמיתי מההזמנה במונגו.
    */
    const normalizeDateKey = (value: unknown) => {
      if (!value) return "";

      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
      }

      const raw = String(value).trim();
      if (!raw) return "";

      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        return raw.slice(0, 10);
      }

      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return "";

      return parsed.toISOString().slice(0, 10);
    };

    const userEventDateSyncOps = users
      .map((u: any) => {
        const invitation = invitationByUserId.get(String(u._id));
        const invitationEventDate = invitation?.eventDate;

        if (!invitationEventDate) return null;

        const invitationKey = normalizeDateKey(invitationEventDate);
        const userKey = normalizeDateKey(u.eventDate);

        if (!invitationKey || invitationKey === userKey) return null;

        return {
          updateOne: {
            filter: { _id: u._id },
            update: { $set: { eventDate: invitationEventDate } },
          },
        };
      })
      .filter(Boolean);

    if (userEventDateSyncOps.length > 0) {
      await User.bulkWrite(userEventDateSyncOps as any[], { ordered: false });

      for (const u of users) {
        const invitation = invitationByUserId.get(String(u._id));
        if (!invitation?.eventDate) continue;

        const invitationKey = normalizeDateKey(invitation.eventDate);
        const userKey = normalizeDateKey(u.eventDate);

        if (invitationKey && invitationKey !== userKey) {
          u.eventDate = invitation.eventDate;
        }
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
            invitationTitle: null,
            invitationShareId: null,
            eventDate: u.eventDate || null,

            messageRounds: buildMessageRounds(null, [], u),
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

        const includeTransportationManagement =
          Boolean(u.accessModules?.transportationManagement) ||
          Boolean(u.includeTransportationManagement) ||
          Boolean(u.salesUpsells?.transportationManagement?.enabled) ||
          Boolean(u.planLimits?.transportationEnabled);

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
          transportationManagement: Boolean(
            u.accessModules?.transportationManagement ??
              includeTransportationManagement
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

        const includeCreditGifts =
          Boolean(u.includeCreditGifts) || Boolean(planData.includeCreditGifts);

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

          includeCreditGifts,
          creditGiftsAddonPrice: includeCreditGifts && planData.includeCreditGifts
            ? 0
            : Number(u.creditGiftsAddonPrice || 0),

          includeDigitalSeating,
          includeEventManagement,
          includeTransportationManagement,
          includeCustomDesign,
          includePreRsvpInvitation: readPreRsvpFlags(u).invitationOnlyEnabled,
          includePreRsvpSaveTheDate: readPreRsvpFlags(u).saveTheDateEnabled,

          accessModules,

          rsvpSiteMode: normalizeRsvpSiteMode(
            u.rsvpSiteMode ?? u.guestExperienceType
          ),
          guestExperienceType: guestExperienceFromRsvpSiteMode(
            u.rsvpSiteMode ?? u.guestExperienceType
          ),

          totalPaid: Number(payment?.totalPaid || u.paidAmount || 0),
          paymentsCount: Number(payment?.paymentsCount || 0),
          lastPaymentAt: payment?.lastPaymentAt || null,
          paymentTypes: payment?.paymentTypes || [],
          invitationId: invitation?._id ? String(invitation._id) : null,
          invitationTitle: invitation?.title ? String(invitation.title) : null,
          invitationShareId: invitation?.shareId
            ? String(invitation.shareId)
            : null,

          // מקור האמת לתאריך אירוע: ההזמנה במונגו
          eventDate: invitation?.eventDate || u.eventDate || null,

          messageRounds: buildMessageRounds(invitation, scheduledMessages, u),
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
      return jsonError("UNAUTHORIZED", 401);
    }

    if (!isAdminContext(auth)) {
      return jsonError("FORBIDDEN", 403);
    }

    const body = await req.json().catch(() => null);

    const {
      name,
      email,
      phone,
      role,
      limits,
      billing,
      addons,
      plan,
      accessModules,
      callRoundsSchedule,
      rsvpSiteMode,

      // staff fields
      staffType,
      employeeScope,
      assignedProducerId,
    } = body || {};

    const safeName = normalizeString(name);
    const safeEmail = normalizeEmail(email);
    const safePhone = normalizeString(phone);
    const safeRole = normalizeString(role);

    if (!safeName || !safeEmail || !safeRole) {
      return jsonError("MISSING_REQUIRED_FIELDS", 400);
    }

    const allowedRoles = ["user", "producer", "staff", "venue_owner"];

    if (!allowedRoles.includes(safeRole)) {
      return jsonError("INVALID_ROLE", 400);
    }

    const existing = await User.findOne({
      email: safeEmail,
    })
      .select("_id")
      .lean();

    if (existing) {
      return jsonError("EMAIL_ALREADY_EXISTS", 409);
    }

    /* =========================
       VENUE OWNER
    ========================= */
    if (safeRole === "venue_owner") {
      const user = await User.create({
        name: safeName,
        email: safeEmail,
        phone: safePhone,
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

      const passwordSetup = await deliverPasswordSetup(String(user._id));

      return NextResponse.json(
        {
          success: true,
          userId: String(user._id),
          role: "venue_owner",
          passwordSetup: serializePasswordSetup(passwordSetup),
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
        phone: safePhone,
        role: "producer",

        plan: "basic",
        priceKey: "producer_manual",
        packageName: "מפיק",

        guests: 0,
        maxGuests: 0,
        allowedMessageRounds: 2,
        maxMessages: 0,
        smsLimit: 0,
        smsUsed: 0,

        includeCalls: false,
        includeCreditGifts: false,
        includeDigitalSeating: false,
        includeEventManagement: false,
        includeCustomDesign: false,

        producerPricePerRecord: pricePerRecord,

        hasPaid: true,
        paidAmount: 0,
        isActive: true,

        needsPasswordSetup: true,
        createdByAdmin: true,
        billingSource: "admin",
      });

      const passwordSetup = await deliverPasswordSetup(String(user._id));

      return NextResponse.json(
        {
          success: true,
          userId: String(user._id),
          role: "producer",
          passwordSetup: serializePasswordSetup(passwordSetup),
        },
        { status: 201 }
      );
    }

    /* =========================
       STAFF
    ========================= */
    if (safeRole === "staff") {
      const allowedStaffTypes = [
        "producer_staff",
        "general_staff",
        "seating_staff",
        "usher_staff",
      ];

      const requestedStaffType = normalizeString(staffType);

      const safeStaffType = allowedStaffTypes.includes(requestedStaffType)
        ? requestedStaffType
        : "general_staff";

      const safeEmployeeScope =
        safeStaffType === "producer_staff" ? "producer" : "system";

      if (safeStaffType === "producer_staff" && !assignedProducerId) {
        return jsonError("ASSIGNED_PRODUCER_REQUIRED", 400);
      }

      const staffMeta: Record<
        string,
        {
          priceKey: string;
          packageName: string;
        }
      > = {
        producer_staff: {
          priceKey: "producer_staff_manual",
          packageName: "עובד מפיק",
        },
        general_staff: {
          priceKey: "staff_manual",
          packageName: "עובד מערכת",
        },
        seating_staff: {
          priceKey: "seating_staff_manual",
          packageName: "עובד הושבה",
        },
        usher_staff: {
          priceKey: "usher_staff_manual",
          packageName: "דייל",
        },
      };

      const selectedStaffMeta =
        staffMeta[safeStaffType] || staffMeta.general_staff;

      const user = await User.create({
        name: safeName,
        email: safeEmail,
        phone: safePhone,
        role: "staff",

        staffType: safeStaffType,
        employeeScope: safeEmployeeScope,

        assignedProducerId:
          safeStaffType === "producer_staff" ? assignedProducerId : null,

        producerId: null,
        createdByProducer: null,
        assignedStaffIds: [],
        assignedClientIds: [],

        plan: "basic",
        priceKey: selectedStaffMeta.priceKey,
        packageName: selectedStaffMeta.packageName,

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

      const passwordSetup = await deliverPasswordSetup(String(user._id));

      return NextResponse.json(
        {
          success: true,
          userId: String(user._id),
          role: "staff",
          staffType: safeStaffType,
          employeeScope: safeEmployeeScope,
          priceKey: selectedStaffMeta.priceKey,
          packageName: selectedStaffMeta.packageName,
          passwordSetup: serializePasswordSetup(passwordSetup),
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
      return jsonError("INVALID_LIMITS_OR_BILLING", 400);
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
      allowedMessageRounds,

      smsEnabled: false,
      smsLimit: 0,

      seatingEnabled: finalAccessModules.rsvpSeating,
      remindersEnabled: true,
      callsEnabled: finalIncludeCalls,
    };

    const paymentStatus = billing?.paymentStatus || "paid";
    const hasPaid = paymentStatus === "paid";
    const paidAt = hasPaid && priceNum > 0 ? new Date() : null;

    const user = await User.create({
      name: safeName,
      email: safeEmail,
      phone: safePhone,
      role: "user",

      plan: selectedPlanKey,
      priceKey: selectedPlanKey,
      packageName: planData.label,

      planLimits,

      guests: recordsNum,
      maxGuests: recordsNum,

      allowedMessageRounds,

      rsvpSiteMode: normalizeRsvpSiteMode(rsvpSiteMode),

      maxMessages: 0,
      smsLimit: 0,

      includeCalls: finalIncludeCalls,
      callsRounds: finalIncludeCalls ? 3 : 0,
      callsAddonPrice: Number(addons?.calls?.price || 0),
      callRoundsSchedule: normalizeCallRoundsSchedule(
        callRoundsSchedule,
        finalIncludeCalls
      ),

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
      totalDealAmount: hasPaid ? priceNum : 0,
      remainingAmount: 0,
      paymentMode: hasPaid ? (priceNum > 0 ? "full" : "free") : "none",
      paidAt,
      lastPaymentAt: paidAt,
      payments:
        hasPaid && priceNum > 0
          ? [
              {
                amount: priceNum,
                type: "full",
                method: "manual",
                status: "paid",
                paidAt,
                createdAt: paidAt,
                note: "יצירת לקוח מאדמין",
                createdBy: auth.impersonatedBy || auth.userId || null,
              },
            ]
          : [],
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

          includeCalls: finalIncludeCalls,
          includeCreditGifts: finalIncludeCreditGifts,
          creditGiftsAddonPrice: finalIncludeCreditGifts && planData.includeCreditGifts
            ? 0
            : Number(addons?.credit?.price || 0),
          includeDigitalSeating: finalAccessModules.rsvpSeating,
          includeEventManagement: finalAccessModules.eventProduction,
          includeCustomDesign: finalCustomDesign,

          accessModules: finalAccessModules,
        },
      });
    }

    const passwordSetup = await deliverPasswordSetup(String(user._id));

    return NextResponse.json(
      {
        success: true,
        userId: String(user._id),
        role: "user",
        passwordSetup: serializePasswordSetup(passwordSetup),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("🔥 ADMIN USERS POST ERROR:", err);

    return jsonError("SERVER_ERROR", 500);
  }
}