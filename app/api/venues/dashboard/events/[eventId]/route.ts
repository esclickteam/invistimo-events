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

function getFirstNumber(source: any, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = source?.[key];
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeStatus(value: unknown) {
  return cleanString(value).toLowerCase();
}

function isConfirmedGuest(row: any) {
  const values = [
    row?.status,
    row?.rsvpStatus,
    row?.response,
    row?.attendanceStatus,
    row?.arrivalStatus,
    row?.answer,
  ].map(normalizeStatus);

  if (
    values.some((value) =>
      [
        "confirmed",
        "coming",
        "arriving",
        "arrive",
        "yes",
        "approved",
        "accepted",
        "attending",
        "מגיע",
        "מגיעים",
        "אישר",
        "אישרו",
      ].includes(value)
    )
  ) {
    return true;
  }

  if (row?.isComing === true) return true;
  if (row?.attending === true) return true;
  if (row?.confirmed === true) return true;
  if (row?.arrives === true) return true;

  return false;
}

function isDeclinedGuest(row: any) {
  const values = [
    row?.status,
    row?.rsvpStatus,
    row?.response,
    row?.attendanceStatus,
    row?.arrivalStatus,
    row?.answer,
  ].map(normalizeStatus);

  if (
    values.some((value) =>
      [
        "declined",
        "not-coming",
        "not_coming",
        "not coming",
        "no",
        "cancelled",
        "rejected",
        "לא מגיע",
        "לא מגיעים",
        "לא",
      ].includes(value)
    )
  ) {
    return true;
  }

  if (row?.isComing === false) return true;
  if (row?.attending === false) return true;
  if (row?.confirmed === false) return true;
  if (row?.arrives === false) return true;

  return false;
}

function getConfirmedAmount(row: any) {
  const amount = getFirstNumber(
    row,
    [
      "confirmedGuestsAmount",
      "confirmedAmount",
      "arrivingCount",
      "arriveCount",
      "comingAmount",
      "comingCount",
      "guestsAmount",
      "guestAmount",
      "amount",
      "quantity",
      "count",
      "guests",
      "guestsCount",
      "numberOfGuests",
      "totalGuests",
      "participants",
    ],
    1
  );

  return Math.max(1, amount);
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

function serializeEvent(event: any, hall?: any) {
  return {
    id: String(event._id),
    _id: String(event._id),

    userId: event.userId ? String(event.userId) : "",
    producerId: event.producerId ? String(event.producerId) : "",
    assignedStaffIds: Array.isArray(event.assignedStaffIds)
      ? event.assignedStaffIds.map((id: any) => String(id))
      : [],

    venueOwnerId: event.venueOwnerId ? String(event.venueOwnerId) : "",
    venueHallId: event.venueHallId || "",
    venueHallName: event.venueHallName || hall?.name || "",
    venueLinkedAt: event.venueLinkedAt || null,
    venueAccessStatus: event.venueAccessStatus || "none",

    email: event.email || "",

    eventType: event.eventType || "wedding",
    title: event.title || "",

    budgetTotal: event.budgetTotal || 0,
    estimatedGuests: event.estimatedGuests ?? null,
    estimatedGuestCount: event.estimatedGuestCount ?? null,

    date: event.date || "",
    time: event.time || "",

    location: {
      address: event.location?.address || "",
      lat: event.location?.lat,
      lng: event.location?.lng,
    },

    giftCreditUrl: event.giftCreditUrl || "",

    maxGuests: event.maxGuests || 0,

    paymentStatus: event.paymentStatus || "paid",
    status: event.status || "active",

    notes: event.notes || "",

    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

async function findInvitationForEvent(event: any) {
  const invitations = getCollection("invitations");

  if (!invitations) return null;

  const eventIdValues = objectIdOrString(event._id);

  const query = {
    $or: [
      { eventId: { $in: eventIdValues } },
      { productionEventId: { $in: eventIdValues } },
      { linkedEventId: { $in: eventIdValues } },
      { event: { $in: eventIdValues } },
      { userId: { $in: objectIdOrString(event.userId) }, date: event.date },
    ],
  };

  return invitations.findOne(query);
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

  const guestsCollection =
    getCollection("guests") ||
    getCollection("guestrecords") ||
    getCollection("guestRecords");

  if (!guestsCollection) {
    return empty;
  }

  const eventIdValues = objectIdOrString(event._id);
  const userIdValues = objectIdOrString(event.userId);
  const invitationIdValues = invitation?._id ? objectIdOrString(invitation._id) : [];

  const orQuery: any[] = [
    { eventId: { $in: eventIdValues } },
    { productionEventId: { $in: eventIdValues } },
    { linkedEventId: { $in: eventIdValues } },
  ];

  if (invitationIdValues.length) {
    orQuery.push({ invitationId: { $in: invitationIdValues } });
    orQuery.push({ inviteId: { $in: invitationIdValues } });
  }

  if (event.date) {
    orQuery.push({
      userId: { $in: userIdValues },
      eventDate: event.date,
    });
  }

  const rows = await guestsCollection.find({ $or: orQuery }).toArray();

  if (!rows.length) {
    return {
      ...empty,
      enabled: Boolean(invitation),
    };
  }

  let confirmedRecords = 0;
  let declinedRecords = 0;
  let confirmedGuestsAmount = 0;

  for (const row of rows) {
    if (isConfirmedGuest(row)) {
      confirmedRecords += 1;
      confirmedGuestsAmount += getConfirmedAmount(row);
      continue;
    }

    if (isDeclinedGuest(row)) {
      declinedRecords += 1;
    }
  }

  const recordsCount = rows.length;
  const pendingRecords = Math.max(0, recordsCount - confirmedRecords - declinedRecords);

  return {
    enabled: true,
    recordsCount,
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

async function buildSeatingStats(event: any, invitation: any, confirmedGuestsAmount: number) {
  const empty = {
    enabled: false,
    totalTables: 0,
    seatedGuests: 0,
    unseatedGuests: 0,
    completed: false,
  };

  const eventIdValues = objectIdOrString(event._id);
  const invitationIdValues = invitation?._id ? objectIdOrString(invitation._id) : [];

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
    event.estimatedGuestCount ||
    event.estimatedGuests ||
    event.maxGuests ||
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

async function buildStats(event: any) {
  const invitation = await findInvitationForEvent(event);
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
   שליפת אירוע Event אמיתי עבור בעל אולם
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

    const hall = await getVenueHallForEvent(event, auth.userId);
    const stats = await buildStats(event);

    return NextResponse.json({
      success: true,
      event: serializeEvent(event, hall),
      hall: serializeHall(hall),
      stats,
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
   עדכון שדות שמותר לבעל אולם לעדכן על Event
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

    const requestedTitle = cleanString(body.title);
    const requestedDate = cleanString(body.date);
    const requestedTime = cleanString(body.time);
    const requestedEventType = cleanString(body.eventType);
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

    existingEvent.budgetTotal = Math.max(
      0,
      toNumber(body.budgetTotal, existingEvent.budgetTotal || 0)
    );

    if (allowedPaymentStatuses.includes(requestedPaymentStatus)) {
      existingEvent.paymentStatus = requestedPaymentStatus;
    }

    if (allowedEventStatuses.includes(requestedStatus)) {
      existingEvent.status = requestedStatus;
    }

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

    if (!existingEvent.venueLinkedAt && existingEvent.venueAccessStatus === "linked") {
      existingEvent.venueLinkedAt = new Date();
    }

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

    existingEvent.notes = cleanString(body.notes);

    await existingEvent.save();

    const hall = await getVenueHallForEvent(existingEvent, auth.userId);
    const stats = await buildStats(existingEvent);

    return NextResponse.json({
      success: true,
      message: "האירוע עודכן בהצלחה",
      event: serializeEvent(existingEvent, hall),
      hall: serializeHall(hall),
      stats,
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