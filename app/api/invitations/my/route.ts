import { NextResponse } from "next/server";
import mongoose from "mongoose";
import db from "@/lib/db";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import Event from "@/models/Event";
import ScheduledMessage from "@/models/ScheduledMessage";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import {
  buildInvitationRsvpFields,
  getOwnerRsvpSiteMode,
} from "@/lib/weddingWebsite/rsvpSiteMode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* ============================================================
  Helpers
============================================================ */

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toObjectId(id?: string | null) {
  const cleanId = cleanString(id);

  if (!cleanId) return null;
  if (!mongoose.Types.ObjectId.isValid(cleanId)) return null;

  return new mongoose.Types.ObjectId(cleanId);
}

function normalizeEventId(eventId: any): string | null {
  if (!eventId) return null;

  if (typeof eventId === "object" && eventId !== null && "_id" in eventId) {
    return String((eventId as any)._id);
  }

  if (mongoose.Types.ObjectId.isValid(eventId)) {
    return String(eventId);
  }

  return null;
}

function normalizeId(value: any): string {
  if (!value) return "";

  if (typeof value === "object" && value !== null && "_id" in value) {
    return String(value._id);
  }

  return String(value);
}

function resolveProducerContext(auth: any, user: any) {
  const role = auth?.role ?? user?.role ?? null;
  const staffType = auth?.staffType ?? user?.staffType ?? null;
  const impersonationRole = auth?.impersonationRole ?? null;

  const isProducer = role === "producer" || impersonationRole === "producer";

  const isProducerStaff =
    (role === "staff" && staffType === "producer_staff") ||
    impersonationRole === "producer_staff" ||
    impersonationRole === "staff_producer";

  const isProducerLike = isProducer || isProducerStaff;

  const effectiveProducerId = isProducer
    ? String(auth.userId)
    : user?.assignedProducerId
      ? String(user.assignedProducerId)
      : user?.createdByProducer
        ? String(user.createdByProducer)
        : null;

  const assignedClientIds: string[] = Array.isArray(user?.assignedClientIds)
    ? user.assignedClientIds.map((x: any) => String(x))
    : [];

  return {
    role,
    staffType,
    impersonationRole,
    isProducer,
    isProducerStaff,
    isProducerLike,
    effectiveProducerId,
    assignedClientIds,
  };
}

function normalizePreRsvpMessagesAccess(user: any) {
  const preRsvpMessages = user?.salesUpsells?.preRsvpMessages || {};
  const mode = cleanString(preRsvpMessages.mode || "none");

  const saveTheDateEnabled = Boolean(
    preRsvpMessages.saveTheDateEnabled ??
      (mode === "save_the_date_only" || mode === "both")
  );

  const invitationOnlyEnabled = Boolean(
    preRsvpMessages.invitationOnlyEnabled ??
      (mode === "invitation_only" || mode === "both")
  );

  const saveTheDateSentCount = Number(
    preRsvpMessages.saveTheDateSentCount ||
      (mode === "save_the_date_only" ? preRsvpMessages.sentCount : 0) ||
      0
  );

  const invitationOnlySentCount = Number(
    preRsvpMessages.invitationOnlySentCount ||
      (mode === "invitation_only" ? preRsvpMessages.sentCount : 0) ||
      0
  );

  const saveTheDateSentAt =
    preRsvpMessages.saveTheDateSentAt ||
    (mode === "save_the_date_only" ? preRsvpMessages.sentAt : null) ||
    null;

  const invitationOnlySentAt =
    preRsvpMessages.invitationOnlySentAt ||
    (mode === "invitation_only" ? preRsvpMessages.sentAt : null) ||
    null;

  return {
    enabled: Boolean(preRsvpMessages.enabled),
    mode,
    price: Number(preRsvpMessages.price || 0),
    givenFree: Boolean(preRsvpMessages.givenFree),
    notes: cleanString(preRsvpMessages.notes),

    saveTheDateEnabled,
    invitationOnlyEnabled,

    saveTheDateSentCount,
    saveTheDateSentAt,

    invitationOnlySentCount,
    invitationOnlySentAt,

    sentCount: Number(preRsvpMessages.sentCount || 0),
    sentAt: preRsvpMessages.sentAt || null,
  };
}

function normalizePreRsvpMedia(invitation: any) {
  const preRsvpMedia = invitation?.preRsvpMedia || {};

  return {
    saveTheDateImageUrl: cleanString(preRsvpMedia.saveTheDateImageUrl),
    saveTheDateImagePublicId: cleanString(
      preRsvpMedia.saveTheDateImagePublicId
    ),
    invitationOnlyImageUrl: cleanString(
      preRsvpMedia.invitationOnlyImageUrl
    ),
    invitationOnlyImagePublicId: cleanString(
      preRsvpMedia.invitationOnlyImagePublicId
    ),
  };
}

function buildInvitationResponse(invitation: any) {
  const normalizedEventId = normalizeEventId(invitation.eventId);

  return {
    ...invitation,

    _id: normalizeId(invitation._id),

    eventId: normalizedEventId,
    invitationId: normalizeId(invitation._id),

    event:
      typeof invitation.eventId === "object" && invitation.eventId !== null
        ? invitation.eventId
        : null,

    ownerId: invitation.ownerId ? normalizeId(invitation.ownerId) : null,
    userId: invitation.userId ? normalizeId(invitation.userId) : null,

    venueClientEventId: invitation.venueClientEventId
      ? normalizeId(invitation.venueClientEventId)
      : null,

    venueClientInvitationId: normalizeId(invitation._id),

    preRsvpMedia: normalizePreRsvpMedia(invitation),
  };
}

/* ============================================================
  GET — מחזיר את ההזמנה של המשתמש
============================================================ */

export async function GET(req: Request) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);
    const userObjectId = toObjectId(userId);

    const { searchParams } = new URL(req.url);
    const includeVenueClient =
      searchParams.get("includeVenueClient") === "1" ||
      searchParams.get("venueClient") === "1";

    const eventIdFromQuery = cleanString(searchParams.get("eventId"));
    const eventObjectIdFromQuery = toObjectId(eventIdFromQuery);

    const user = await User.findById(userId)
      .select(
        `
          email
          role
          staffType
          createdByProducer
          assignedProducerId
          assignedClientIds

          venueClientSource
          billingSource
          venueClientEventId
          venueClientInvitationId
          venueHallId
          venueClientHallId
          venueSeatingTemplateId

          salesUpsells.preRsvpMessages
        `
      )
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const ctx = resolveProducerContext(auth, user);

    const orFilters: any[] = [];

    if (userObjectId) {
      orFilters.push({ ownerId: userObjectId });
      orFilters.push({ userId: userObjectId });
    }

    if (userId) {
      orFilters.push({ ownerId: userId });
      orFilters.push({ userId });
    }

    const producerIdObj = toObjectId(ctx.effectiveProducerId);

    if (producerIdObj) {
      orFilters.push({ producerId: producerIdObj });
    }

    const assignedClientObjIds = ctx.assignedClientIds
      .map((id) => toObjectId(id))
      .filter(Boolean) as mongoose.Types.ObjectId[];

    if (assignedClientObjIds.length > 0) {
      orFilters.push({ ownerId: { $in: assignedClientObjIds } });
      orFilters.push({ userId: { $in: assignedClientObjIds } });
    }

    const venueClientInvitationId = toObjectId(
      (user as any)?.venueClientInvitationId
    );

    if (venueClientInvitationId) {
      orFilters.push({ _id: venueClientInvitationId });
    }

    const userVenueClientEventId = toObjectId((user as any)?.venueClientEventId);

    if (userVenueClientEventId) {
      orFilters.push({ eventId: userVenueClientEventId });
      orFilters.push({ venueClientEventId: userVenueClientEventId });
      orFilters.push({ productionEventId: userVenueClientEventId });
      orFilters.push({ linkedEventId: userVenueClientEventId });
    }

    if (eventObjectIdFromQuery) {
      orFilters.push({ eventId: eventObjectIdFromQuery });
      orFilters.push({ venueClientEventId: eventObjectIdFromQuery });
      orFilters.push({ productionEventId: eventObjectIdFromQuery });
      orFilters.push({ linkedEventId: eventObjectIdFromQuery });
    }

    if (orFilters.length === 0) {
      return NextResponse.json({ success: true, invitation: null });
    }

    const baseQuery: any = {
      eventId: { $ne: null },
      $or: orFilters,
    };

    const invitation = await Invitation.findOne(baseQuery)
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate({
        path: "eventId",
        select: `
          title
          date
          time
          eventType
          type
          location
          imageUrl
          coverImageUrl
          giftCreditUrl
        `,
      })
      .select(`
        _id
        title

        eventId
        productionEventId
        linkedEventId
        venueClientEventId

        previewImage
        headerImageUrl
        preRsvpMedia

        maxGuests
        maxMessages
        remainingMessages
        shareId
        invitationSettings
        rsvpSiteMode
        guestExperienceType

        producerId
        ownerId
        userId

        location
        eventDate
        eventTime
        eventType
        giftCreditUrl

        venueSource
        venueOwnerId
        venueHallId
        venueHallName
        venueAccessStatus

        venueClientPackageType
        venueClientRecordsCount
        venueClientPaymentStatus

        seatingEnabled
        rsvpEnabled
        eventManagementEnabled

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

        updatedAt
        createdAt
      `)
      .lean();

    let rawVenueInvitation: any = null;

    if (!invitation && includeVenueClient && userObjectId) {
      const invitationsCollection =
        mongoose.connection.db?.collection("invitations");

      rawVenueInvitation = await invitationsCollection?.findOne(
        {
          $or: [
            { userId: userObjectId },
            { userId },
            ...(venueClientInvitationId
              ? [{ _id: venueClientInvitationId }]
              : []),
            ...(userVenueClientEventId
              ? [
                  { eventId: userVenueClientEventId },
                  { venueClientEventId: userVenueClientEventId },
                  { productionEventId: userVenueClientEventId },
                  { linkedEventId: userVenueClientEventId },
                ]
              : []),
            ...(eventObjectIdFromQuery
              ? [
                  { eventId: eventObjectIdFromQuery },
                  { venueClientEventId: eventObjectIdFromQuery },
                  { productionEventId: eventObjectIdFromQuery },
                  { linkedEventId: eventObjectIdFromQuery },
                ]
              : []),
          ],
          eventId: { $ne: null },
        },
        {
          sort: {
            updatedAt: -1,
            createdAt: -1,
          },
        }
      );
    }

    const finalInvitation = invitation || rawVenueInvitation;

    if (!finalInvitation) {
      return NextResponse.json({ success: true, invitation: null });
    }

    const invitationOwnerId =
      normalizeId(finalInvitation.ownerId) || normalizeId(finalInvitation.userId);

    const ownerUser =
      invitationOwnerId && invitationOwnerId !== userId
        ? await User.findById(invitationOwnerId)
            .select("salesUpsells.preRsvpMessages")
            .lean()
        : user;

    const preRsvpMessages = normalizePreRsvpMessagesAccess(ownerUser || user);

    const finalInvitationId = normalizeId(finalInvitation._id);
    const finalInvitationObjectId = toObjectId(finalInvitationId);

    const scheduledMessageOrFilters: any[] = [
      { invitationId: finalInvitationId },
    ];

    if (finalInvitationObjectId) {
      scheduledMessageOrFilters.push({
        invitationId: finalInvitationObjectId,
      });
    }

    const scheduledMessages = await ScheduledMessage.find({
      status: { $in: ["scheduled", "sent"] },
      $or: scheduledMessageOrFilters,
    })
      .select(`
        _id
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
        sentAt
        status
      `)
      .sort({ scheduledAt: 1, sentAt: 1 })
      .lean();

    const normalizedScheduledMessages = scheduledMessages.map((message: any) => ({
      ...message,
      _id: normalizeId(message._id),
      userId: message.userId ? normalizeId(message.userId) : null,
      invitationId: message.invitationId
        ? normalizeId(message.invitationId)
        : null,
    }));

    return NextResponse.json({
      success: true,
      invitation: {
        ...buildInvitationResponse(finalInvitation),
        preRsvpMessages,
        scheduledMessages: normalizedScheduledMessages,
      },
      user: {
        _id: userId,
        role: (user as any)?.role || "",
        staffType: (user as any)?.staffType || "",
        preRsvpMessages,
        salesUpsells: {
          preRsvpMessages,
        },
      },
      currentUser: {
        _id: userId,
        role: (user as any)?.role || "",
        staffType: (user as any)?.staffType || "",
        preRsvpMessages,
        salesUpsells: {
          preRsvpMessages,
        },
      },
    });
  } catch (err) {
    console.error("❌ Error loading my invitation:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

/* ============================================================
  POST — יצירת הזמנה
============================================================ */

export async function POST(req: Request) {
  try {
    await db();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = String(auth.userId);

    const user = await User.findById(userId)
      .select(
        "email guests maxMessages createdByProducer assignedProducerId role staffType"
      )
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const { eventId } = body;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, error: "INVALID_EVENT_ID" },
        { status: 400 }
      );
    }

    const event = await Event.findOne({ _id: eventId, userId }).lean();

    if (!event) {
      return NextResponse.json(
        { success: false, error: "EVENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    const ctx = resolveProducerContext(auth, user);
    const producerId = ctx.effectiveProducerId;
    const producerIdObj = toObjectId(producerId);

    const queryOr: any[] = [{ ownerId: event.userId ?? userId }];

    if (producerIdObj) {
      queryOr.push({ producerId: producerIdObj });
    }

    let invitation: any = await Invitation.findOne({
      eventId: event._id,
      $or: queryOr,
    }).lean();

    if (!invitation) {
      const ownerId = event.userId ?? userId;
      const rsvpSiteMode = await getOwnerRsvpSiteMode(ownerId);

      invitation = await Invitation.create({
        ownerId,
        producerId: producerIdObj ?? null,
        eventId: event._id,
        guests: [],
        maxGuests:
          Number((user as any).guests) ||
          Number((event as any).maxGuests) ||
          100,
        maxMessages: Number((user as any).maxMessages) || 300,
        sentSmsCount: 0,
        preRsvpMedia: {
          saveTheDateImageUrl: "",
          saveTheDateImagePublicId: "",
          invitationOnlyImageUrl: "",
          invitationOnlyImagePublicId: "",
        },
        ...buildInvitationRsvpFields(rsvpSiteMode, {
          title: event.title,
          eventDate: event.date || event.eventDate || null,
          eventTime: event.time || "",
          location: event.location || {},
        }),
      });
    }

    return NextResponse.json(
      {
        success: true,
        invitation: {
          _id: String(invitation._id),
          eventId: String(invitation.eventId),
          maxGuests: invitation.maxGuests,
          maxMessages: invitation.maxMessages,
          remainingMessages: invitation.remainingMessages,
          shareId: invitation.shareId,
          producerId: invitation.producerId ?? null,
          preRsvpMedia: normalizePreRsvpMedia(invitation),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error creating invitation:", err);

    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}