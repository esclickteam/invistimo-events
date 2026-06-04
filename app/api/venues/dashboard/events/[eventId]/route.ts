import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";
import Event from "@/models/Event";
import VenueHall from "@/models/VenueHall";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{
    eventId: string;
  }>;
};

const allowedEventTypes = [
  "wedding",
  "bar-mitzvah",
  "bat-mitzvah",
  "brit",
  "brita",
  "henna",
  "other",
];

const allowedPaymentStatuses = ["paid", "refunded"];
const allowedEventStatuses = ["active", "archived"];
const allowedVenueAccessStatuses = ["none", "linked", "disabled"];

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toObjectId(value: unknown) {
  const id = cleanString(value);

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

function objectIdOrString(value: unknown) {
  const stringValue = cleanString(value);
  const objectIdValue = toObjectId(stringValue);

  return objectIdValue ? [objectIdValue, stringValue] : [stringValue];
}

function getCollection(name: string) {
  return mongoose.connection.db?.collection(name);
}

function getUserCollection() {
  return getCollection("users");
}

function normalizeDateOnly(value: unknown) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = cleanString(value);

  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeStatus(value: unknown) {
  return cleanString(value).toLowerCase();
}

function normalizeEventType(value: unknown) {
  const raw = cleanString(value);

  if (allowedEventTypes.includes(raw)) {
    return raw;
  }

  const lower = raw.toLowerCase();

  if (lower.includes("חתונה") || lower.includes("wedding")) return "wedding";
  if (lower.includes("בר מצווה")) return "bar-mitzvah";
  if (lower.includes("בת מצווה")) return "bat-mitzvah";
  if (lower.includes("בריתה")) return "brita";
  if (lower.includes("ברית")) return "brit";
  if (lower.includes("חינה")) return "henna";

  return "other";
}

function serializeHall(hall: any) {
  if (!hall) return null;

  return {
    id: String(hall.id || hall._id || ""),
    _id: hall._id ? String(hall._id) : "",
    ownerId: hall.ownerId ? String(hall.ownerId) : "",
    name: hall.name || "",
    subtitle: hall.subtitle || "",
    capacity: hall.capacity || 0,
    status: hall.status || "active",
    image: hall.image || "",
  };
}

function getInvitationDate(invitation: any) {
  return normalizeDateOnly(invitation?.eventDate || invitation?.date);
}

function getInvitationTime(invitation: any) {
  return cleanString(invitation?.eventTime || invitation?.time);
}

function getInvitationTitle(invitation: any) {
  return (
    cleanString(invitation?.title) ||
    cleanString(invitation?.eventTitle) ||
    cleanString(invitation?.eventName)
  );
}

async function getVenueOwnerUser(authUserId: string) {
  const users = getUserCollection();
  const authObjectId = toObjectId(authUserId);

  if (!users || !authObjectId) return null;

  return users.findOne({
    _id: authObjectId,
  });
}

async function findVenueHallByOwner(
  authUserId: string,
  preferredHallId?: string
) {
  const ownerObjectId = toObjectId(authUserId);
  const hallObjectId = toObjectId(preferredHallId);

  const ownerValues = ownerObjectId ? [ownerObjectId, authUserId] : [authUserId];

  const baseQuery: any = {
    ownerId: { $in: ownerValues },
  };

  if (preferredHallId) {
    const hall = await VenueHall.findOne({
      ...baseQuery,
      $or: [
        { id: preferredHallId },
        ...(hallObjectId ? [{ _id: hallObjectId }] : []),
      ],
    }).lean();

    if (hall) return hall;
  }

  return VenueHall.findOne({
    ...baseQuery,
    status: { $ne: "deleted" },
  })
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .lean();
}

/**
 * משלים שדות אולם חסרים בתוך Event.
 * חשוב במיוחד כש-event מוגדר linked אבל venueHallId/venueHallName ריקים.
 */
async function ensureEventVenueFields(event: any, authUserId: string) {
  if (!event?._id || !authUserId) return event;

  const venueOwner = await getVenueOwnerUser(authUserId);

  const preferredHallId =
    cleanString(event.venueHallId) ||
    cleanString(venueOwner?.venueHallId) ||
    cleanString(venueOwner?.venueClientHallId);

  const hall = await findVenueHallByOwner(authUserId, preferredHallId);

  const venueHallId =
    cleanString(event.venueHallId) ||
    cleanString(venueOwner?.venueHallId) ||
    cleanString(venueOwner?.venueClientHallId) ||
    cleanString(hall?.id) ||
    cleanString(hall?._id);

  const venueHallName =
    cleanString(event.venueHallName) ||
    cleanString(venueOwner?.venueHallName) ||
    cleanString(venueOwner?.venueClientHallName) ||
    cleanString(hall?.name);

  const venueSeatingTemplateId =
    event.venueSeatingTemplateId ||
    venueOwner?.venueSeatingTemplateId ||
    venueOwner?.venueClientSeatingTemplateId ||
    null;

  const venueSeatingTemplateName =
    cleanString(event.venueSeatingTemplateName) ||
    cleanString(venueOwner?.venueSeatingTemplateName) ||
    cleanString(venueOwner?.venueClientSeatingTemplateName);

  const update: any = {
    venueOwnerId: toObjectId(authUserId) || authUserId,
    venueAccessStatus: "linked",
    updatedAt: new Date(),
  };

  if (venueHallId) update.venueHallId = venueHallId;
  if (venueHallName) update.venueHallName = venueHallName;

  if (venueSeatingTemplateId) {
    update.venueSeatingTemplateId = venueSeatingTemplateId;
  }

  if (venueSeatingTemplateName) {
    update.venueSeatingTemplateName = venueSeatingTemplateName;
  }

  if (!event.venueLinkedAt) {
    update.venueLinkedAt = new Date();
  }

  await Event.updateOne(
    { _id: event._id },
    {
      $set: update,
    }
  );

  return {
    ...event,
    ...update,
  };
}

/**
 * Event = מקור אמת לשיוך אולם.
 * Invitation = מקור אמת לפרטי ההזמנה והמוזמנים.
 */
function serializeEvent(event: any, hall?: any, invitation?: any) {
  const venueHallId =
    cleanString(event.venueHallId) || cleanString(hall?.id || hall?._id);

  const venueHallName =
    cleanString(event.venueHallName) || cleanString(hall?.name);

  const title =
    getInvitationTitle(invitation) ||
    cleanString(event.title) ||
    "אירוע ללא שם";

  const eventType =
    cleanString(invitation?.eventType) ||
    cleanString(event.eventType) ||
    "wedding";

  const date = getInvitationDate(invitation) || normalizeDateOnly(event.date);
  const time = getInvitationTime(invitation) || cleanString(event.time);

  const location = invitation?.location || event.location || {};

  const maxGuests =
    toNumber(invitation?.maxGuests, 0) ||
    toNumber(invitation?.estimatedGuests, 0) ||
    toNumber(invitation?.estimatedGuestCount, 0) ||
    toNumber(event.maxGuests, 0) ||
    toNumber(event.estimatedGuests, 0) ||
    toNumber(event.estimatedGuestCount, 0) ||
    0;

  const budgetTotal =
    toNumber(invitation?.budgetTotal, 0) ||
    toNumber(event.budgetTotal, 0) ||
    0;

  const paymentStatus =
    cleanString(invitation?.paymentStatus) ||
    cleanString(event.paymentStatus) ||
    "paid";

  const email = cleanString(invitation?.email) || cleanString(event.email) || "";
  const notes = cleanString(invitation?.notes) || cleanString(event.notes) || "";

  const venueClientInvitationId =
    invitation?._id ||
    invitation?.venueClientInvitationId ||
    event.venueClientInvitationId ||
    "";

  const venueClientUserId =
    event.venueClientUserId ||
    invitation?.userId ||
    invitation?.ownerId ||
    event.userId ||
    "";

  const venueClientPackageType =
    cleanString(event.venueClientPackageType) ||
    cleanString(invitation?.venueClientPackageType);

  const venueClientPaymentStatus =
    cleanString(event.venueClientPaymentStatus) ||
    cleanString(invitation?.venueClientPaymentStatus);

  const venueClientRecordsCount =
    toNumber(event.venueClientRecordsCount, 0) ||
    toNumber(invitation?.venueClientRecordsCount, 0) ||
    (Array.isArray(invitation?.guests) ? invitation.guests.length : 0) ||
    0;

  return {
    id: String(event._id),
    _id: String(event._id),

    invitationId: invitation?._id ? String(invitation._id) : "",
    shareId: cleanString(invitation?.shareId),
    source: invitation ? "invitation" : "event",

    userId: event.userId ? String(event.userId) : "",
    producerId: event.producerId ? String(event.producerId) : "",
    assignedStaffIds: Array.isArray(event.assignedStaffIds)
      ? event.assignedStaffIds.map((id: any) => String(id))
      : [],

    venueOwnerId: event.venueOwnerId ? String(event.venueOwnerId) : "",
    venueHallId,
    venueHallName,
    venueLinkedAt: event.venueLinkedAt || null,
    venueAccessStatus: event.venueAccessStatus || "none",

    venueSeatingTemplateId: event.venueSeatingTemplateId
      ? String(event.venueSeatingTemplateId)
      : "",
    venueSeatingTemplateName: cleanString(event.venueSeatingTemplateName),

    venueClientUserId: venueClientUserId ? String(venueClientUserId) : "",
    venueClientInvitationId: venueClientInvitationId
      ? String(venueClientInvitationId)
      : "",
    venueClientPackageType,
    venueClientPaymentStatus,
    venueClientRecordsCount,

    email,
    eventType,
    title,

    budgetTotal,
    estimatedGuests: maxGuests,
    estimatedGuestCount: maxGuests,

    date,
    time,

    location: {
      address: cleanString(location?.address || location?.name),
      lat: location?.lat,
      lng: location?.lng,
    },

    giftCreditUrl:
      cleanString(invitation?.giftCreditUrl) ||
      cleanString(event.giftCreditUrl),

    maxGuests,

    paymentStatus,
    status: event.status || "active",

    notes,

    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

async function countGuestsForInvitationId(invitationId: any) {
  const guestsCollection = getCollection("invitationguests");

  if (!guestsCollection || !invitationId) return 0;

  const invitationIdValues = objectIdOrString(invitationId);

  return guestsCollection.countDocuments({
    $or: [
      { invitationId: { $in: invitationIdValues } },
      { inviteId: { $in: invitationIdValues } },
      { invitation: { $in: invitationIdValues } },
      { invitationID: { $in: invitationIdValues } },
      { invitation_id: { $in: invitationIdValues } },
    ],
  });
}

/**
 * מחפש את ההזמנה העדכנית ביותר של אירוע אולם.
 */
async function findLatestInvitationForEvent(event: any) {
  const invitations = getCollection("invitations");

  if (!invitations || !event?._id) return null;

  const eventIdValues = objectIdOrString(event._id);

  const ownerValues: any[] = [];
  const candidates: any[] = [];

  const currentInvitationObjectId = toObjectId(event.venueClientInvitationId);

  if (currentInvitationObjectId) {
    const currentInvitation = await invitations.findOne({
      _id: currentInvitationObjectId,
    });

    if (currentInvitation) {
      candidates.push(currentInvitation);

      if (currentInvitation.ownerId) {
        ownerValues.push(...objectIdOrString(currentInvitation.ownerId));
      }

      if (currentInvitation.userId) {
        ownerValues.push(...objectIdOrString(currentInvitation.userId));
      }

      if (currentInvitation.clientId) {
        ownerValues.push(...objectIdOrString(currentInvitation.clientId));
      }
    }
  }

  if (event?.venueClientUserId) {
    ownerValues.push(...objectIdOrString(event.venueClientUserId));
  }

  if (event?.userId) {
    ownerValues.push(...objectIdOrString(event.userId));
  }

  const uniqueOwnerValues = Array.from(
    new Map(ownerValues.map((value) => [String(value), value])).values()
  );

  if (uniqueOwnerValues.length) {
    const latestUserInvitations = await invitations
      .find({
        $or: [
          { ownerId: { $in: uniqueOwnerValues } },
          { userId: { $in: uniqueOwnerValues } },
          { clientId: { $in: uniqueOwnerValues } },
        ],
      })
      .sort({ createdAt: -1, updatedAt: -1, _id: -1 })
      .limit(20)
      .toArray();

    candidates.push(...latestUserInvitations);
  }

  const eventLinkedInvitations = await invitations
    .find({
      $or: [
        { eventId: { $in: eventIdValues } },
        { venueClientEventId: { $in: eventIdValues } },
        { productionEventId: { $in: eventIdValues } },
        { linkedEventId: { $in: eventIdValues } },
        { event: { $in: eventIdValues } },
      ],
    })
    .sort({ createdAt: -1, updatedAt: -1, _id: -1 })
    .limit(20)
    .toArray();

  candidates.push(...eventLinkedInvitations);

  const uniqueCandidates = Array.from(
    new Map(
      candidates
        .filter(Boolean)
        .map((candidate) => [String(candidate?._id), candidate])
    ).values()
  );

  console.log("VENUE INVITATION CANDIDATES:", {
    eventId: String(event._id),
    oldVenueClientInvitationId: event.venueClientInvitationId
      ? String(event.venueClientInvitationId)
      : "",
    ownerValues: uniqueOwnerValues.map((value) => String(value)),
    candidates: uniqueCandidates.map((candidate: any) => ({
      id: String(candidate._id),
      ownerId: candidate.ownerId ? String(candidate.ownerId) : "",
      userId: candidate.userId ? String(candidate.userId) : "",
      clientId: candidate.clientId ? String(candidate.clientId) : "",
      eventId: candidate.eventId ? String(candidate.eventId) : "",
      productionEventId: candidate.productionEventId
        ? String(candidate.productionEventId)
        : "",
      linkedEventId: candidate.linkedEventId
        ? String(candidate.linkedEventId)
        : "",
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    })),
  });

  if (!uniqueCandidates.length) return null;

  uniqueCandidates.sort((a: any, b: any) => {
    const aDate =
      new Date(a?.createdAt || a?.updatedAt || 0).getTime() ||
      (a?._id?.getTimestamp ? a._id.getTimestamp().getTime() : 0);

    const bDate =
      new Date(b?.createdAt || b?.updatedAt || 0).getTime() ||
      (b?._id?.getTimestamp ? b._id.getTimestamp().getTime() : 0);

    return bDate - aDate;
  });

  return uniqueCandidates[0] || null;
}

/**
 * מסנכרן את Event של האולם להזמנה העדכנית ביותר.
 * עכשיו גם משלים שדות אולם חסרים.
 */
async function syncEventToLatestInvitation(event: any, authUserId?: string) {
  let workingEvent = event;

  if (authUserId) {
    workingEvent = await ensureEventVenueFields(workingEvent, authUserId);
  }

  const latestInvitation = await findLatestInvitationForEvent(workingEvent);

  if (!latestInvitation?._id) {
    return {
      event: workingEvent,
      invitation: null,
    };
  }

  const latestInvitationId = String(latestInvitation._id);
  const currentInvitationId = String(workingEvent.venueClientInvitationId || "");

  const recordsCount = await countGuestsForInvitationId(latestInvitation._id);

  const update: any = {
    venueClientInvitationId: latestInvitation._id,
    venueClientUserId:
      latestInvitation.ownerId ||
      latestInvitation.userId ||
      latestInvitation.clientId ||
      workingEvent.venueClientUserId ||
      workingEvent.userId ||
      null,
    venueClientRecordsCount: recordsCount,
    venueAccessStatus: "linked",
    updatedAt: new Date(),
  };

  if (authUserId) {
    update.venueOwnerId = toObjectId(authUserId) || authUserId;
  }

  const shouldUpdateInvitation =
    currentInvitationId !== latestInvitationId ||
    toNumber(workingEvent.venueClientRecordsCount, 0) !== recordsCount;

  if (shouldUpdateInvitation) {
    const eventsCollection = getCollection("events");

    if (eventsCollection) {
      await eventsCollection.updateOne(
        { _id: workingEvent._id },
        {
          $set: update,
        }
      );
    }

    workingEvent = {
      ...workingEvent,
      ...update,
    };
  }

  if (authUserId) {
    workingEvent = await ensureEventVenueFields(workingEvent, authUserId);
  }

  return {
    event: workingEvent,
    invitation: latestInvitation,
  };
}

async function findInvitationForEvent(event: any, authUserId?: string) {
  const synced = await syncEventToLatestInvitation(event, authUserId);

  if (synced.invitation) return synced.invitation;

  const invitations = getCollection("invitations");

  if (!invitations) return null;

  const venueClientInvitationId = toObjectId(event.venueClientInvitationId);

  if (venueClientInvitationId) {
    const directInvitation = await invitations.findOne({
      _id: venueClientInvitationId,
    });

    if (directInvitation) return directInvitation;
  }

  return null;
}

async function buildRsvpStats(event: any, invitation: any) {
  const empty = {
    enabled: false,
    recordsCount: 0,
    confirmedRecords: 0,
    declinedRecords: 0,
    pendingRecords: 0,
    confirmedGuestsAmount: 0,
  };

  const guestsCollection = getCollection("invitationguests");

  const invitationIdValues: any[] = [];

  if (invitation?._id) {
    invitationIdValues.push(...objectIdOrString(invitation._id));
  }

  if (!invitation?._id && event?.venueClientInvitationId) {
    invitationIdValues.push(...objectIdOrString(event.venueClientInvitationId));
  }

  const uniqueInvitationIdValues = Array.from(
    new Map(invitationIdValues.map((value) => [String(value), value])).values()
  );

  let rows: any[] = [];

  if (guestsCollection && uniqueInvitationIdValues.length) {
    rows = await guestsCollection
      .find({
        $or: [
          { invitationId: { $in: uniqueInvitationIdValues } },
          { inviteId: { $in: uniqueInvitationIdValues } },
          { invitation: { $in: uniqueInvitationIdValues } },
          { invitationID: { $in: uniqueInvitationIdValues } },
          { invitation_id: { $in: uniqueInvitationIdValues } },
        ],
      })
      .toArray();
  }

  if (!rows.length && Array.isArray(invitation?.guests)) {
    rows = invitation.guests;
  }

  if (!rows.length) {
    return {
      ...empty,
      enabled: Boolean(invitation?._id || event?.venueClientInvitationId),
    };
  }

  let confirmedRecords = 0;
  let declinedRecords = 0;
  let pendingRecords = 0;
  let confirmedGuestsAmount = 0;

  for (const row of rows) {
    const rawStatus = cleanString(
      row.rsvpStatus ??
        row.responseStatus ??
        row.attendanceStatus ??
        row.confirmationStatus ??
        row.arrivalStatus ??
        row.status ??
        row.rsvp ??
        "pending"
    ).toLowerCase();

    const guestsCount = Math.max(
      1,
      toNumber(
        row.arrivedCount ??
          row.actualArrivedCount ??
          row.confirmedGuestsAmount ??
          row.confirmedGuestsCount ??
          row.guestsComing ??
          row.attendingCount ??
          row.guestsCount ??
          row.guestCount ??
          row.count ??
          row.amount ??
          row.guestsAmount ??
          row.totalGuests ??
          row.quantity,
        1
      )
    );

    const isDeclined =
      rawStatus === "no" ||
      rawStatus === "declined" ||
      rawStatus === "not_coming" ||
      rawStatus === "not-coming" ||
      rawStatus === "not coming" ||
      rawStatus === "cancelled" ||
      rawStatus === "לא מגיע" ||
      rawStatus === "לא מגיעים" ||
      rawStatus === "לא מאשר" ||
      rawStatus.includes("לא מגיע");

    const isConfirmed =
      !isDeclined &&
      (rawStatus === "yes" ||
        rawStatus === "confirmed" ||
        rawStatus === "arriving" ||
        rawStatus === "arrive" ||
        rawStatus === "attending" ||
        rawStatus === "approved" ||
        rawStatus === "מגיע" ||
        rawStatus === "מגיעים" ||
        rawStatus === "אישר" ||
        rawStatus === "מאשר" ||
        rawStatus.includes("מגיע"));

    if (isConfirmed) {
      confirmedRecords += 1;
      confirmedGuestsAmount += guestsCount;
      continue;
    }

    if (isDeclined) {
      declinedRecords += 1;
      continue;
    }

    pendingRecords += 1;
  }

  return {
    enabled: true,
    recordsCount: rows.length,
    confirmedRecords,
    declinedRecords,
    pendingRecords,
    confirmedGuestsAmount,
  };
}

function countSeatedFromTable(table: any) {
  let count = 0;

  const arraysToCheck = [
    table?.seatedGuests,
    table?.seats,
    table?.chairs,
    table?.guests,
    table?.assignedGuests,
    table?.placements,
  ];

  for (const arr of arraysToCheck) {
    if (!Array.isArray(arr)) continue;

    for (const item of arr) {
      if (!item) continue;

      if (typeof item === "string" && item.trim()) {
        count += 1;
        continue;
      }

      if (
        item.guestId ||
        item.guest ||
        item.guestName ||
        item.name ||
        item.recordId ||
        item.phone
      ) {
        count += 1;
      }
    }
  }

  return count;
}

async function buildSeatingStats(
  event: any,
  invitation: any,
  confirmedGuestsAmount: number
) {
  const empty = {
    enabled: false,
    totalTables: 0,
    seatedGuests: 0,
    unseatedGuests: 0,
    completed: false,
  };

  const eventIdValues = objectIdOrString(event._id);

  const invitationIdValues: any[] = [];

  if (invitation?._id) {
    invitationIdValues.push(...objectIdOrString(invitation._id));
  }

  if (!invitation?._id && event?.venueClientInvitationId) {
    invitationIdValues.push(...objectIdOrString(event.venueClientInvitationId));
  }

  const uniqueInvitationIdValues = Array.from(
    new Map(invitationIdValues.map((value) => [String(value), value])).values()
  );

  const invitationShareId = cleanString(invitation?.shareId);

  const collection = getCollection("seatingtables");

  if (!collection) {
    return empty;
  }

  const orQuery: any[] = [
    { eventId: { $in: eventIdValues } },
    { productionEventId: { $in: eventIdValues } },
    { linkedEventId: { $in: eventIdValues } },
  ];

  if (uniqueInvitationIdValues.length) {
    orQuery.push({ invitationId: { $in: uniqueInvitationIdValues } });
    orQuery.push({ inviteId: { $in: uniqueInvitationIdValues } });
    orQuery.push({ invitation: { $in: uniqueInvitationIdValues } });
  }

  if (invitationShareId) {
    orQuery.push({ shareId: invitationShareId });
    orQuery.push({ invitationShareId });
  }

  const docs = await collection
    .find({
      $or: orQuery,
      "tables.0": { $exists: true },
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();

  if (!docs.length) {
    return empty;
  }

  let tables: any[] = [];

  for (const doc of docs) {
    if (Array.isArray(doc.tables)) {
      tables = [...tables, ...doc.tables];
    }
  }

  const totalTables = tables.length;

  let seatedGuests = 0;

  for (const table of tables) {
    seatedGuests += countSeatedFromTable(table);
  }

  const targetGuests =
    confirmedGuestsAmount ||
    toNumber(event.venueClientRecordsCount, 0) ||
    toNumber(invitation?.maxGuests, 0) ||
    toNumber(invitation?.estimatedGuests, 0) ||
    toNumber(invitation?.estimatedGuestCount, 0) ||
    (Array.isArray(invitation?.guests) ? invitation.guests.length : 0) ||
    toNumber(event.estimatedGuestCount, 0) ||
    toNumber(event.estimatedGuests, 0) ||
    toNumber(event.maxGuests, 0) ||
    0;

  const unseatedGuests = Math.max(0, Number(targetGuests || 0) - seatedGuests);

  return {
    enabled: true,
    totalTables,
    seatedGuests,
    unseatedGuests,
    completed: totalTables > 0 && targetGuests > 0 && unseatedGuests === 0,
  };
}

async function buildProductionStats(event: any) {
  const tasksCollection =
    getCollection("eventtasks") ||
    getCollection("eventTasks") ||
    getCollection("tasks");

  let tasksTotal = 0;
  let tasksDone = 0;

  if (tasksCollection) {
    const eventIdValues = objectIdOrString(event._id);

    const tasks = await tasksCollection
      .find({
        $or: [
          { eventId: { $in: eventIdValues } },
          { productionEventId: { $in: eventIdValues } },
          { linkedEventId: { $in: eventIdValues } },
        ],
      })
      .toArray();

    tasksTotal = tasks.length;
    tasksDone = tasks.filter((task: any) => {
      const status = normalizeStatus(task?.status);
      return status === "done" || status === "completed" || status === "בוצע";
    }).length;
  }

  return {
    managerName: "",
    tasksTotal,
    tasksDone,
  };
}

async function buildStats(event: any, invitation: any) {
  const rsvp = await buildRsvpStats(event, invitation);

  const seating = await buildSeatingStats(
    event,
    invitation,
    rsvp.confirmedGuestsAmount
  );

  const production = await buildProductionStats(event);

  return {
    rsvp,
    seating,
    production,
  };
}

async function getVenueHallForEvent(event: any, authUserId: string) {
  const venueHallId = cleanString(event.venueHallId);

  if (!venueHallId) {
    return findVenueHallByOwner(authUserId);
  }

  const ownerObjectId = toObjectId(authUserId);
  const hallObjectId = toObjectId(venueHallId);

  const ownerValues = ownerObjectId ? [ownerObjectId, authUserId] : [authUserId];

  const hall = await VenueHall.findOne({
    ownerId: { $in: ownerValues },
    $or: [
      { id: venueHallId },
      ...(hallObjectId ? [{ _id: hallObjectId }] : []),
    ],
  }).lean();

  return hall;
}

/* ======================================================
   GET /api/venues/dashboard/events/[eventId]
====================================================== */

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const { eventId } = await params;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה אירוע לא תקין",
        },
        { status: 400 }
      );
    }

    let event: any = await Event.findOne({
      _id: eventId,
      venueOwnerId: auth.userId,
      venueAccessStatus: "linked",
    }).lean();

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: "האירוע לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      );
    }

    const synced = await syncEventToLatestInvitation(event, auth.userId);
    event = synced.event;

    const invitation =
      synced.invitation || (await findInvitationForEvent(event, auth.userId));

    const hall = await getVenueHallForEvent(event, auth.userId);
    const stats = await buildStats(event, invitation);

    return NextResponse.json({
      success: true,
      event: serializeEvent(event, hall, invitation),
      hall: serializeHall(hall),
      stats,
      invitation: invitation
        ? {
            id: String(invitation._id),
            _id: String(invitation._id),
            shareId: cleanString(invitation.shareId),
            venueClientInvitationId: String(invitation._id),
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/venues/dashboard/events/[eventId] failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "טעינת פרטי האירוע נכשלה",
      },
      { status: 500 }
    );
  }
}

/* ======================================================
   PATCH /api/venues/dashboard/events/[eventId]
====================================================== */

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const { eventId } = await params;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה אירוע לא תקין",
        },
        { status: 400 }
      );
    }

    const existingEvent = await Event.findOne({
      _id: eventId,
      venueOwnerId: auth.userId,
      venueAccessStatus: "linked",
    });

    if (!existingEvent) {
      return NextResponse.json(
        {
          success: false,
          message: "האירוע לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      );
    }

    const body = await req.json();

    const syncedBeforePatch = await syncEventToLatestInvitation(
      existingEvent.toObject ? existingEvent.toObject() : existingEvent,
      auth.userId
    );

    const invitation = syncedBeforePatch.invitation;

    const requestedTitle = cleanString(body.title);
    const requestedDate = normalizeDateOnly(body.date);
    const requestedTime = cleanString(body.time);
    const requestedEventType = normalizeEventType(body.eventType);
    const requestedPaymentStatus = cleanString(body.paymentStatus);
    const requestedStatus = cleanString(body.status);
    const requestedVenueAccessStatus = cleanString(body.venueAccessStatus);

    if (!requestedDate) {
      return NextResponse.json(
        {
          success: false,
          message: "חובה להזין תאריך אירוע",
        },
        { status: 400 }
      );
    }

    const venueHallId = cleanString(body.venueHallId);
    const venueHallName = cleanString(body.venueHallName);
    const venueSeatingTemplateName = cleanString(body.venueSeatingTemplateName);

    if (venueHallId) {
      existingEvent.venueHallId = venueHallId;
    }

    if (venueHallName) {
      existingEvent.venueHallName = venueHallName;
    }

    if (
      body.venueSeatingTemplateId &&
      mongoose.Types.ObjectId.isValid(String(body.venueSeatingTemplateId))
    ) {
      existingEvent.venueSeatingTemplateId = new mongoose.Types.ObjectId(
        String(body.venueSeatingTemplateId)
      );
    }

    if (venueSeatingTemplateName) {
      existingEvent.venueSeatingTemplateName = venueSeatingTemplateName;
    }

    if (allowedVenueAccessStatuses.includes(requestedVenueAccessStatus)) {
      existingEvent.venueAccessStatus = requestedVenueAccessStatus;
    }

    if (
      !existingEvent.venueLinkedAt &&
      existingEvent.venueAccessStatus === "linked"
    ) {
      existingEvent.venueLinkedAt = new Date();
    }

    if (allowedEventStatuses.includes(requestedStatus)) {
      existingEvent.status = requestedStatus;
    }

    if (allowedPaymentStatuses.includes(requestedPaymentStatus)) {
      existingEvent.paymentStatus = requestedPaymentStatus;
    }

    existingEvent.notes = cleanString(body.notes);

    if (requestedTitle) {
      existingEvent.title = requestedTitle;
    }

    if (allowedEventTypes.includes(requestedEventType)) {
      existingEvent.eventType = requestedEventType;
    }

    existingEvent.date = requestedDate;
    existingEvent.time = requestedTime;

    existingEvent.estimatedGuests = Math.max(
      0,
      toNumber(body.estimatedGuests, existingEvent.estimatedGuests || 0)
    );

    existingEvent.estimatedGuestCount = Math.max(
      0,
      toNumber(
        body.estimatedGuestCount ?? body.estimatedGuests,
        existingEvent.estimatedGuestCount || existingEvent.estimatedGuests || 0
      )
    );

    existingEvent.maxGuests =
      existingEvent.estimatedGuestCount || existingEvent.maxGuests || 0;

    existingEvent.budgetTotal = Math.max(
      0,
      toNumber(body.budgetTotal, existingEvent.budgetTotal || 0)
    );

    if (body.location && typeof body.location === "object") {
      existingEvent.location = {
        address: cleanString(body.location.address),
        lat:
          body.location.lat === undefined || body.location.lat === null
            ? existingEvent.location?.lat
            : toNumber(body.location.lat, existingEvent.location?.lat),
        lng:
          body.location.lng === undefined || body.location.lng === null
            ? existingEvent.location?.lng
            : toNumber(body.location.lng, existingEvent.location?.lng),
      };
    }

    await existingEvent.save();

    const ensuredAfterSave = await ensureEventVenueFields(
      existingEvent.toObject ? existingEvent.toObject() : existingEvent,
      auth.userId
    );

    if (invitation?._id) {
      const invitations = getCollection("invitations");

      if (invitations) {
        const invitationUpdate: any = {
          updatedAt: new Date(),

          eventId: existingEvent._id,
          productionEventId: existingEvent._id,
          linkedEventId: existingEvent._id,
          venueClientEventId: existingEvent._id,

          venueOwnerId: ensuredAfterSave.venueOwnerId || existingEvent.venueOwnerId,
          venueHallId: ensuredAfterSave.venueHallId || existingEvent.venueHallId,
          venueHallName:
            ensuredAfterSave.venueHallName || existingEvent.venueHallName,
          venueSeatingTemplateId:
            ensuredAfterSave.venueSeatingTemplateId ||
            existingEvent.venueSeatingTemplateId ||
            null,
          venueSeatingTemplateName:
            ensuredAfterSave.venueSeatingTemplateName ||
            cleanString(existingEvent.venueSeatingTemplateName),
        };

        if (requestedTitle) {
          invitationUpdate.title = requestedTitle;
          invitationUpdate.eventTitle = requestedTitle;
        }

        if (allowedEventTypes.includes(requestedEventType)) {
          invitationUpdate.eventType = requestedEventType;
        }

        if (requestedDate) {
          invitationUpdate.eventDate = requestedDate;
          invitationUpdate.date = requestedDate;
        }

        if (requestedTime) {
          invitationUpdate.eventTime = requestedTime;
          invitationUpdate.time = requestedTime;
        }

        const estimatedGuests = Math.max(
          0,
          toNumber(
            body.estimatedGuestCount ?? body.estimatedGuests,
            existingEvent.estimatedGuestCount ||
              existingEvent.estimatedGuests ||
              0
          )
        );

        invitationUpdate.estimatedGuests = estimatedGuests;
        invitationUpdate.estimatedGuestCount = estimatedGuests;
        invitationUpdate.maxGuests = estimatedGuests;

        invitationUpdate.budgetTotal = existingEvent.budgetTotal;
        invitationUpdate.paymentStatus = existingEvent.paymentStatus;
        invitationUpdate.notes = existingEvent.notes;

        if (body.location && typeof body.location === "object") {
          invitationUpdate.location = {
            address: cleanString(body.location.address),
            lat: body.location.lat,
            lng: body.location.lng,
          };
        }

        await invitations.updateOne(
          { _id: invitation._id },
          {
            $set: invitationUpdate,
          }
        );
      }
    }

    const updatedEvent = await Event.findById(existingEvent._id).lean();

    const syncedAfterPatch = updatedEvent
      ? await syncEventToLatestInvitation(updatedEvent, auth.userId)
      : { event: ensuredAfterSave, invitation };

    const finalEvent = syncedAfterPatch.event || updatedEvent || ensuredAfterSave;
    const finalInvitation = syncedAfterPatch.invitation || invitation;

    const hall = await getVenueHallForEvent(finalEvent, auth.userId);
    const stats = await buildStats(finalEvent, finalInvitation);

    return NextResponse.json({
      success: true,
      message: "האירוע עודכן בהצלחה",
      event: serializeEvent(finalEvent, hall, finalInvitation),
      hall: serializeHall(hall),
      stats,
      invitation: finalInvitation
        ? {
            id: String(finalInvitation._id),
            _id: String(finalInvitation._id),
            shareId: cleanString(finalInvitation.shareId),
            venueClientInvitationId: String(finalInvitation._id),
          }
        : null,
    });
  } catch (error) {
    console.error("PATCH /api/venues/dashboard/events/[eventId] failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "עדכון האירוע נכשל",
      },
      { status: 500 }
    );
  }
}

/* ======================================================
   DELETE /api/venues/dashboard/events/[eventId]
====================================================== */

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    await connectDB();

    const auth = await getUserIdFromRequest(req);

    if (!auth?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "לא מחובר",
        },
        { status: 401 }
      );
    }

    const { eventId } = await params;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        {
          success: false,
          message: "מזהה אירוע לא תקין",
        },
        { status: 400 }
      );
    }

    const event = await Event.findOne({
      _id: eventId,
      venueOwnerId: auth.userId,
      venueAccessStatus: "linked",
    });

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          message: "האירוע לא נמצא או שאין הרשאה",
        },
        { status: 404 }
      );
    }

    event.venueAccessStatus = "disabled";
    event.venueLinkedAt = event.venueLinkedAt || new Date();

    await event.save();

    return NextResponse.json({
      success: true,
      message: "האירוע נותק מהאולם בהצלחה",
    });
  } catch (error) {
    console.error("DELETE /api/venues/dashboard/events/[eventId] failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "ניתוק האירוע מהאולם נכשל",
      },
      { status: 500 }
    );
  }
}