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

/**
 * Event = מקור אמת לשיוך אולם בלבד
 * Invitation = מקור אמת לפרטי האירוע
 */
function serializeEvent(event: any, hall?: any, invitation?: any) {
  const venueHallId = cleanString(event.venueHallId);
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

  const email =
    cleanString(invitation?.email) || cleanString(event.email) || "";

  const notes =
    cleanString(invitation?.notes) || cleanString(event.notes) || "";

  const venueClientInvitationId =
    event.venueClientInvitationId ||
    invitation?._id ||
    invitation?.venueClientInvitationId ||
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
    maxGuests;

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

    /**
     * מה-Event בלבד
     */
    venueOwnerId: event.venueOwnerId ? String(event.venueOwnerId) : "",
    venueHallId,
    venueHallName,
    venueLinkedAt: event.venueLinkedAt || null,
    venueAccessStatus: event.venueAccessStatus || "none",

    /**
     * שדות לקוח אולם
     * חובה לטאב ההושבה באולם:
     * /dashboard/seating?eventId=...&invitationId=...&venueView=1
     */
    venueClientUserId: venueClientUserId ? String(venueClientUserId) : "",
    venueClientInvitationId: venueClientInvitationId
      ? String(venueClientInvitationId)
      : "",
    venueClientPackageType,
    venueClientPaymentStatus,
    venueClientRecordsCount,

    /**
     * מה-Invitation קודם
     */
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

async function findInvitationForEvent(event: any) {
  const invitations = getCollection("invitations");

  if (!invitations) return null;

  const venueClientInvitationId = toObjectId(event.venueClientInvitationId);

  /*
    לקוח אולם:
    אם ה-Event כבר מחזיק venueClientInvitationId,
    זו ההזמנה המדויקת שצריך להחזיר לאולם.
  */
  if (venueClientInvitationId) {
    const directInvitation = await invitations.findOne({
      _id: venueClientInvitationId,
    });

    if (directInvitation) return directInvitation;
  }

  const eventIdValues = objectIdOrString(event._id);

  const query = {
    $or: [
      { eventId: { $in: eventIdValues } },
      { venueClientEventId: { $in: eventIdValues } },
      { productionEventId: { $in: eventIdValues } },
      { linkedEventId: { $in: eventIdValues } },
      { event: { $in: eventIdValues } },
    ],
  };

  const invitation = await invitations.findOne(query);

  if (invitation) return invitation;

  /**
   * fallback ישן בלבד:
   * אם בעבר לא נשמר eventId בהזמנה.
   */
  const userIdValues = objectIdOrString(event.userId);
  const eventDate = normalizeDateOnly(event.date);

  if (!eventDate) return null;

  return invitations.findOne({
    userId: { $in: userIdValues },
    $or: [{ eventDate }, { date: eventDate }],
  });
}

/**
 * אישורי הגעה:
 * קורא ישירות מהקולקשן invitationguests לפי invitationId.
 *
 * לפי המבנה אצלך במונגו:
 * invitationId: ObjectId(...)
 * rsvp: "yes" | "no" | "pending"
 * guestsCount: number
 */
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

  if (!guestsCollection) {
    return empty;
  }

  const invitationIdValues: any[] = [];

  /*
    1. ההזמנה הרגילה שנמצאה דרך findInvitationForEvent
  */
  if (invitation?._id) {
    invitationIdValues.push(...objectIdOrString(invitation._id));
  }

  /*
    2. לקוח אולם — אם ה-Event מחזיק venueClientInvitationId
  */
  if (event?.venueClientInvitationId) {
    invitationIdValues.push(...objectIdOrString(event.venueClientInvitationId));
  }

  /*
    ניקוי כפילויות
  */
  const uniqueInvitationIdValues = Array.from(
    new Map(invitationIdValues.map((value) => [String(value), value])).values()
  );

  if (!uniqueInvitationIdValues.length) {
    return empty;
  }

  const rows = await guestsCollection
    .find({
      invitationId: { $in: uniqueInvitationIdValues },
    })
    .toArray();

  if (!rows.length) {
    return {
      ...empty,
      enabled: true,
    };
  }

  let confirmedRecords = 0;
  let declinedRecords = 0;
  let pendingRecords = 0;
  let confirmedGuestsAmount = 0;

  for (const row of rows) {
    const rawStatus = cleanString(
      row.rsvp ||
        row.status ||
        row.responseStatus ||
        row.attendanceStatus ||
        row.confirmationStatus
    ).toLowerCase();

    const guestsCount = Math.max(
      1,
      toNumber(
        row.guestsCount ??
          row.count ??
          row.amount ??
          row.guestsAmount ??
          row.totalGuests,
        1
      )
    );

    const isConfirmed =
      rawStatus === "yes" ||
      rawStatus === "confirmed" ||
      rawStatus === "arriving" ||
      rawStatus === "arrive" ||
      rawStatus === "attending" ||
      rawStatus === "מגיע" ||
      rawStatus === "מגיעים" ||
      rawStatus === "אישר" ||
      rawStatus === "מאשר" ||
      rawStatus.includes("מגיע");

    const isDeclined =
      rawStatus === "no" ||
      rawStatus === "declined" ||
      rawStatus === "not_coming" ||
      rawStatus === "not-coming" ||
      rawStatus === "not coming" ||
      rawStatus === "לא מגיע" ||
      rawStatus === "לא מגיעים" ||
      rawStatus === "לא מאשר" ||
      rawStatus.includes("לא מגיע");

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
  const invitationIdValues = invitation?._id
    ? objectIdOrString(invitation._id)
    : [];

  const invitationShareId = cleanString(invitation?.shareId);

  const possibleCollections = [
    "seatingtables",
    "seatingTables",
    "seatings",
    "seating",
    "tables",
  ];

  let docs: any[] = [];

  for (const collectionName of possibleCollections) {
    const collection = getCollection(collectionName);

    if (!collection) continue;

    const orQuery: any[] = [
      { eventId: { $in: eventIdValues } },
      { productionEventId: { $in: eventIdValues } },
      { linkedEventId: { $in: eventIdValues } },
    ];

    if (invitationIdValues.length) {
      orQuery.push({ invitationId: { $in: invitationIdValues } });
      orQuery.push({ inviteId: { $in: invitationIdValues } });
      orQuery.push({ invitation: { $in: invitationIdValues } });
    }

    if (invitationShareId) {
      orQuery.push({ shareId: invitationShareId });
      orQuery.push({ invitationShareId });
    }

    const found = await collection.find({ $or: orQuery }).toArray();

    if (found.length) {
      docs = found;
      break;
    }
  }

  if (!docs.length) {
    return empty;
  }

  let tables: any[] = [];

  for (const doc of docs) {
    if (Array.isArray(doc.tables)) {
      tables = [...tables, ...doc.tables];
    } else if (Array.isArray(doc.seatingTables)) {
      tables = [...tables, ...doc.seatingTables];
    } else {
      tables.push(doc);
    }
  }

  const totalTables = tables.length || docs.length;

  let seatedGuests = 0;

  for (const table of tables) {
    seatedGuests += countSeatedFromTable(table);
  }

  const targetGuests =
    confirmedGuestsAmount ||
    toNumber(invitation?.maxGuests, 0) ||
    toNumber(invitation?.estimatedGuests, 0) ||
    toNumber(invitation?.estimatedGuestCount, 0) ||
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

  if (!venueHallId) return null;

  const hall = await VenueHall.findOne({
    ownerId: authUserId,
    $or: [{ id: venueHallId }, { _id: toObjectId(venueHallId) || undefined }],
  }).lean();

  return hall;
}

/* ======================================================
   GET /api/venues/dashboard/events/[eventId]
   Event = שיוך לאולם
   Invitation = פרטי אירוע אמיתיים
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

    const event = await Event.findOne({
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

    const invitation = await findInvitationForEvent(event);
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
   בעל אולם מעדכן שיוך/נתוני אולם על Event.
   פרטי אירוע שמקורם בהזמנה יעודכנו גם ב-Invitation אם קיימת.
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

    const invitation = await findInvitationForEvent(existingEvent);

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

    /**
     * Event נשאר מקור אמת לשיוך אולם.
     */
    const venueHallId = cleanString(body.venueHallId);
    const venueHallName = cleanString(body.venueHallName);

    if (venueHallId) {
      existingEvent.venueHallId = venueHallId;
    }

    if (venueHallName) {
      existingEvent.venueHallName = venueHallName;
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

    /**
     * כדי לשמור תאימות גם ליומנים ישנים — מעדכנים Event,
     * אבל המסך עדיין יעדיף Invitation.
     */
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

    /**
     * אם יש Invitation מחוברת — מעדכנים גם אותה,
     * כדי שהפרטים האמיתיים יהיו מסונכרנים בכל המערכת.
     */
    if (invitation?._id) {
      const invitations = getCollection("invitations");

      if (invitations) {
        const invitationUpdate: any = {
          updatedAt: new Date(),

          eventId: existingEvent._id,
          productionEventId: existingEvent._id,
          linkedEventId: existingEvent._id,

          venueOwnerId: existingEvent.venueOwnerId,
          venueHallId: existingEvent.venueHallId,
          venueHallName: existingEvent.venueHallName,
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
    const updatedInvitation = updatedEvent
      ? await findInvitationForEvent(updatedEvent)
      : invitation;

    const hall = await getVenueHallForEvent(
      updatedEvent || existingEvent,
      auth.userId
    );

    const stats = await buildStats(
      updatedEvent || existingEvent,
      updatedInvitation
    );

    return NextResponse.json({
      success: true,
      message: "האירוע עודכן בהצלחה",
      event: serializeEvent(updatedEvent || existingEvent, hall, updatedInvitation),
      hall: serializeHall(hall),
      stats,
      invitation: updatedInvitation
        ? {
            id: String(updatedInvitation._id),
            _id: String(updatedInvitation._id),
            shareId: cleanString(updatedInvitation.shareId),
            venueClientInvitationId: String(updatedInvitation._id),
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
   ניתוק האירוע מהאולם — לא מוחק Event של הלקוח
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