import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import ScheduledMessage from "@/models/ScheduledMessage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================
   Helpers
========================= */

function expireCookie(
  res: NextResponse,
  name: string,
  opts?: { domain?: string; httpOnly?: boolean }
) {
  const base = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  };

  res.cookies.set(name, "", {
    ...base,
    ...(opts?.domain ? { domain: opts.domain } : {}),
    httpOnly: opts?.httpOnly ?? true,
  });

  res.cookies.set(name, "", {
    ...base,
    httpOnly: opts?.httpOnly ?? true,
  });
}

function clearAuthCookies(res: NextResponse) {
  const cookieDomain =
    process.env.NODE_ENV === "production" ? ".invistimo.com" : undefined;

  const cookieNames = [
    "authToken",
    "producerAuthToken",
    "adminAuthToken",
    "token",
    "adminToken",
    "impersonationToken",
  ];

  for (const name of cookieNames) {
    expireCookie(res, name, {
      domain: cookieDomain,
      httpOnly: true,
    });
  }
}

function normalizeId(value: unknown) {
  if (!value) return null;

  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as any)._id);
  }

  return String(value);
}

function normalizeAccessModules(user: any) {
  const includeDigitalSeating =
    Boolean(user?.includeDigitalSeating) ||
    Boolean(user?.includeSeating) ||
    Boolean(user?.planLimits?.seatingEnabled) ||
    user?.plan === "seating_only" ||
    Boolean(user?.venueClientHallId) ||
    Boolean(user?.hallId);

  const includeEventManagement =
    Boolean(user?.includeEventManagement) ||
    Boolean(user?.selfManageEnabled);

  const isVenueOwner = user?.role === "venue_owner" || user?.venueOwner === true;

  return {
    rsvpSeating: Boolean(
      user?.accessModules?.rsvpSeating ?? includeDigitalSeating
    ),

    seating: Boolean(user?.accessModules?.seating ?? includeDigitalSeating),

    digitalSeating: Boolean(
      user?.accessModules?.digitalSeating ?? includeDigitalSeating
    ),

    seatingTemplates: Boolean(
      user?.accessModules?.seatingTemplates ?? includeDigitalSeating
    ),

    eventProduction: Boolean(
      user?.accessModules?.eventProduction ?? includeEventManagement
    ),

    venues: Boolean(user?.accessModules?.venues ?? isVenueOwner),
    venueDashboard: Boolean(user?.accessModules?.venueDashboard ?? isVenueOwner),
    venueCrm: Boolean(user?.accessModules?.venueCrm ?? isVenueOwner),
    venueCalendar: Boolean(user?.accessModules?.venueCalendar ?? isVenueOwner),
    venueMenus: Boolean(user?.accessModules?.venueMenus ?? isVenueOwner),
    venueStaff: Boolean(user?.accessModules?.venueStaff ?? isVenueOwner),
  };
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
      Number(msg?.roundNumber || msg?.round || 0) ===
        Number(params.roundNumber);

    return matchesKind && matchesRound;
  });
}

function buildMessageRounds(
  invitation: any,
  scheduledMessages: any[] = [],
  user: any = null
) {
  const locks = invitation?.adminMessageRoundLocks || {};
  const rsvpRounds = [1, 2, 3];
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
        channel: null,
      })),

      reminder: [
        {
          key: "reminder",
          label: "סבב תזכורת",
          done: false,
          blocked: false,
          sentAt: null,
          scheduledAt: null,
          channel: null,
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
          channel: null,
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
      const roundData = invitation?.rsvpRoundSent?.[`round${round}`];

      const scheduledMessage = findScheduledMessage(scheduledMessages, {
        invitationId,
        userId,
        types: ["rsvp"],
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
        channel: scheduledMessage?.channel || null,
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

/* =========================
   Types
========================= */

type UserRole =
  | "admin"
  | "producer"
  | "client"
  | "user"
  | "staff"
  | "venue_owner";

type EffectiveRole =
  | "producer"
  | "producer_staff"
  | "client"
  | "admin"
  | "user"
  | "venue_owner";

type JwtPayload = {
  userId?: string;
  id?: string;
  _id?: string;

  role?: UserRole;

  hasPaid?: boolean;
  isTrial?: boolean;

  accessModules?: {
    rsvpSeating?: boolean;
    seating?: boolean;
    digitalSeating?: boolean;
    seatingTemplates?: boolean;
    eventProduction?: boolean;

    venues?: boolean;
    venueDashboard?: boolean;
    venueCrm?: boolean;
    venueCalendar?: boolean;
    venueMenus?: boolean;
    venueStaff?: boolean;
  };

  impersonated?: boolean;
  impersonatedBy?: string;
  impersonatedByAdmin?: boolean;
  adminId?: string;

  impersonationRole?:
    | "admin"
    | "producer"
    | "producer_staff"
    | "staff_producer"
    | "venue_owner";

  iat?: number;
  exp?: number;
};

type DecodedTokenResult = {
  decoded: JwtPayload;
  source: string;
};

/* =========================
   Token Resolver
========================= */

function verifyFirstValidToken(
  tokens: Array<{ source: string; value: string | null }>,
  secret: string
): DecodedTokenResult | null {
  let lastError: unknown = null;

  for (const item of tokens) {
    if (!item.value) continue;

    try {
      const decoded = jwt.verify(item.value, secret) as JwtPayload;

      return {
        decoded,
        source: item.source,
      };
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Invalid token skipped: ${item.source}`, err);
    }
  }

  if (lastError) {
    console.error("❌ No valid JWT found. Last error:", lastError);
  }

  return null;
}

/* =========================
   GET /api/me
========================= */

export async function GET() {
  try {
    await connectDB();

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is missing");

      return NextResponse.json(
        {
          success: false,
          user: null,
          error: "SERVER_CONFIG_ERROR",
        },
        {
          status: 500,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const cookieStore = await cookies();

    const authToken = cookieStore.get("authToken")?.value ?? null;
    const producerAuthToken =
      cookieStore.get("producerAuthToken")?.value ?? null;
    const adminAuthToken = cookieStore.get("adminAuthToken")?.value ?? null;

    const legacyToken = cookieStore.get("token")?.value ?? null;
    const legacyAdminToken = cookieStore.get("adminToken")?.value ?? null;
    const impersonationToken =
      cookieStore.get("impersonationToken")?.value ?? null;

    const hasAnyToken =
      !!authToken ||
      !!producerAuthToken ||
      !!adminAuthToken ||
      !!legacyToken ||
      !!legacyAdminToken ||
      !!impersonationToken;

    if (!hasAnyToken) {
      return NextResponse.json(
        {
          success: false,
          user: null,
          error: "NO_TOKEN",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const tokenResult = verifyFirstValidToken(
      [
        { source: "impersonationToken", value: impersonationToken },
        { source: "authToken", value: authToken },
        { source: "producerAuthToken", value: producerAuthToken },
        { source: "adminAuthToken", value: adminAuthToken },
        { source: "adminToken", value: legacyAdminToken },
        { source: "token", value: legacyToken },
      ],
      process.env.JWT_SECRET
    );

    if (!tokenResult?.decoded) {
      const res = NextResponse.json(
        {
          success: false,
          user: null,
          error: "INVALID_TOKEN",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );

      clearAuthCookies(res);
      return res;
    }

    const decoded = tokenResult.decoded;

    const baseUserId = decoded.userId || decoded.id || decoded._id || null;

    if (!baseUserId) {
      const res = NextResponse.json(
        {
          success: false,
          user: null,
          error: "MISSING_USER_ID_IN_TOKEN",
        },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );

      clearAuthCookies(res);
      return res;
    }

    const user = await User.findById(baseUserId).lean();

    if (!user) {
      const res = NextResponse.json(
        {
          success: false,
          user: null,
          error: "USER_NOT_FOUND",
        },
        {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        }
      );

      clearAuthCookies(res);
      return res;
    }

    const currentUser = user as any;

    const safeRole = (currentUser.role as UserRole) ?? "user";

    const staffType = (currentUser.staffType as string | null) ?? null;
    const impersonationRole = decoded.impersonationRole ?? null;

    const accessModules = normalizeAccessModules(currentUser);

    const invitationForMessageRounds = await Invitation.findOne({
      ownerId: currentUser._id,
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
      .lean();

    const scheduledMessagesForMessageRounds =
      invitationForMessageRounds?._id || currentUser?._id
        ? await ScheduledMessage.find({
            status: "scheduled",
            $or: [
              { userId: currentUser._id },
              ...(invitationForMessageRounds?._id
                ? [{ invitationId: invitationForMessageRounds._id }]
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

    const messageRounds = buildMessageRounds(
      invitationForMessageRounds,
      scheduledMessagesForMessageRounds,
      currentUser
    );

    const isVenueOwner =
      safeRole === "venue_owner" ||
      currentUser.venueOwner === true ||
      accessModules.venues === true;

    const isProducer =
      safeRole === "producer" || impersonationRole === "producer";

    const isProducerStaff =
      (safeRole === "staff" && staffType === "producer_staff") ||
      impersonationRole === "producer_staff" ||
      impersonationRole === "staff_producer";

    const isProducerLike = isProducer || isProducerStaff;

    const effectiveRole: EffectiveRole = isProducer
      ? "producer"
      : isProducerStaff
        ? "producer_staff"
        : safeRole === "client"
          ? "client"
          : safeRole === "admin"
            ? "admin"
            : isVenueOwner
              ? "venue_owner"
              : "user";

    const isImpersonated =
      !!decoded.impersonated ||
      !!decoded.impersonatedByAdmin ||
      !!decoded.impersonatedBy;

    const venueClientHallId =
      currentUser.venueClientHallId ||
      currentUser.hallId ||
      currentUser.venueHallId ||
      currentUser.assignedHallId ||
      currentUser.venueSeatingService?.hallId ||
      "";

    const venueClientEventId =
      currentUser.venueClientEventId ||
      currentUser.eventId ||
      currentUser.productionEventId ||
      currentUser.linkedEventId ||
      null;

    const venueClientInvitationId =
      currentUser.venueClientInvitationId ||
      currentUser.invitationId ||
      currentUser.currentInvitationId ||
      currentUser.activeInvitationId ||
      null;

    console.log(
      "✅ ME:",
      currentUser.email,
      "| tokenSource:",
      tokenResult.source,
      "| role:",
      safeRole,
      "| effectiveRole:",
      effectiveRole,
      "| hasPaid:",
      currentUser.hasPaid === true,
      "| venueOwner:",
      isVenueOwner,
      "| venueClientHallId:",
      venueClientHallId || null,
      "| venueClientEventId:",
      venueClientEventId ? normalizeId(venueClientEventId) : null,
      "| venueClientInvitationId:",
      venueClientInvitationId ? normalizeId(venueClientInvitationId) : null,
      "| accessModules:",
      accessModules,
      "| staffType:",
      staffType,
      "| impersonationRole:",
      impersonationRole,
      "| producerLike:",
      isProducerLike,
      "| messageRounds:",
      Boolean(messageRounds),
      isImpersonated ? "| impersonated" : ""
    );

    return NextResponse.json(
      {
        success: true,
        user: {
          _id: String(currentUser._id),
          name: currentUser.name ?? "",
          email: currentUser.email ?? "",

          role: safeRole,
          effectiveRole,
          venueOwner: isVenueOwner,

          staffType,
          assignedProducerId: currentUser.assignedProducerId
            ? String(currentUser.assignedProducerId)
            : null,
          createdByProducer: !!currentUser.createdByProducer,

          isProducerLike,
          isProducerStaff,

          isActive: currentUser.isActive === true,
          hasPaid: currentUser.hasPaid === true,
          isTrial: currentUser.isTrial === true,
          trialExpiresAt: currentUser.trialExpiresAt ?? null,
          hasDashboardAccess: currentUser.hasDashboardAccess === true,

          accessModules,

          includeSeating: currentUser.includeSeating === true,
          includeDigitalSeating: accessModules.rsvpSeating,
          includeEventManagement: accessModules.eventProduction,
          selfManageEnabled: accessModules.eventProduction,

          plan: currentUser.plan ?? "basic",
          packageName: currentUser.packageName ?? "",
          guests: currentUser.guests ?? 0,
          maxGuests: currentUser.maxGuests ?? currentUser.guests ?? 0,
          paidAmount: currentUser.paidAmount ?? 0,
          billingSource: currentUser.billingSource ?? null,
          paymentStatus: currentUser.paymentStatus ?? null,

          /*
            שדות לקוח אולם — חשובים לכפתור/מודאל תבניות הושבה
            וגם לטעינת ההושבה האוטומטית ב-/dashboard/seating
          */
          venueClientSource: currentUser.venueClientSource === true,
          venueClientPackageType: currentUser.venueClientPackageType ?? null,
          venueClientRecordsCount: currentUser.venueClientRecordsCount ?? 0,
          venueClientPaymentStatus:
            currentUser.venueClientPaymentStatus ?? null,
          venueClientPaymentAmount:
            currentUser.venueClientPaymentAmount ?? 0,

          venueOwnerId: currentUser.venueOwnerId
            ? normalizeId(currentUser.venueOwnerId)
            : null,

          venueClientEventId: venueClientEventId
            ? normalizeId(venueClientEventId)
            : null,

          venueClientInvitationId: venueClientInvitationId
            ? normalizeId(venueClientInvitationId)
            : null,

          venueClientHallId: venueClientHallId || null,
          hallId: currentUser.hallId || venueClientHallId || null,
          venueHallId: currentUser.venueHallId || venueClientHallId || null,
          assignedHallId: currentUser.assignedHallId || null,
          venueClientHallName:
            currentUser.venueClientHallName ||
            currentUser.venueHallName ||
            null,
          venueHallName:
            currentUser.venueHallName ||
            currentUser.venueClientHallName ||
            null,

          venueSeatingTemplateId: currentUser.venueSeatingTemplateId
            ? normalizeId(currentUser.venueSeatingTemplateId)
            : null,

          venueSeatingTemplateName:
            currentUser.venueSeatingTemplateName || null,

          venueSeatingTemplateImportedAt:
            currentUser.venueSeatingTemplateImportedAt ?? null,

          venueSeatingService: currentUser.venueSeatingService ?? null,

          planLimits: {
            ...(currentUser.planLimits ?? {}),
            seatingEnabled: accessModules.rsvpSeating,
          },

          includeCalls: !!currentUser.includeCalls,
          callsRounds: currentUser.callsRounds ?? 0,
          callsAddonPrice: currentUser.callsAddonPrice ?? 0,

          callRoundsSchedule: currentUser.callRoundsSchedule ?? {
            enabled: false,
            rounds: [],
          },

          /*
            מחושב בזמן אמת כמו באדמין:
            לא נשמר במודל User, אלא נבנה מתוך Invitation + ScheduledMessage.
          */
          messageRounds,

          includeCreditGifts: !!currentUser.includeCreditGifts,
          creditGiftsAddonPrice: currentUser.creditGiftsAddonPrice ?? 0,

          smsPerRecord: currentUser.smsPerRecord ?? 0,
          maxMessages: currentUser.maxMessages ?? 0,

          smsUsed: currentUser.smsUsed ?? 0,
          smsBalance: currentUser.smsBalance ?? 0,
          whatsappBalance: currentUser.whatsappBalance ?? 0,
          whatsappUsed: currentUser.whatsappUsed ?? 0,

          producerPricePerRecord: currentUser.producerPricePerRecord ?? 0,

          impersonated: isImpersonated,
          impersonatedBy: decoded.impersonatedBy ?? null,
          impersonatedByAdmin: !!decoded.impersonatedByAdmin,
          adminId: decoded.adminId ?? null,
          impersonationRole,

          tokenSource: tokenResult.source,

          createdAt: currentUser.createdAt,
          updatedAt: currentUser.updatedAt ?? null,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (err) {
    console.error("❌ ME API ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        user: null,
        error: "ME_API_ERROR",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}