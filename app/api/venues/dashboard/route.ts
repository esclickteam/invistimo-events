import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

import Event from "@/models/Event";
import Invitation from "@/models/Invitation";
import VenueHall from "@/models/VenueHall";
import VenueTask from "@/models/VenueTask";
import VenueAlert from "@/models/VenueAlert";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TodayEventStatus = "confirmed" | "preparing" | "live" | "done";

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function objectIdString(value: unknown) {
  if (!value) return "";
  return String(value);
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

function monthLabel(date: Date) {
  const labels = [
    "ינו׳",
    "פבר׳",
    "מרץ",
    "אפר׳",
    "מאי",
    "יוני",
    "יולי",
    "אוג׳",
    "ספט׳",
    "אוק׳",
    "נוב׳",
    "דצמ׳",
  ];

  return labels[date.getMonth()];
}

function formatShortDate(value?: string) {
  const cleanValue = normalizeDateOnly(value);

  if (!cleanValue) return "";

  const [year, month, day] = cleanValue.split("-");

  if (!year || !month || !day) {
    return cleanValue;
  }

  return `${day}.${month}.${year}`;
}

function getInvitationIdCandidates(eventId: string) {
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return [];
  }

  const objectId = new mongoose.Types.ObjectId(eventId);

  return [
    { eventId: objectId },
    { productionEventId: objectId },
    { linkedEventId: objectId },
    { eventId },
    { productionEventId: eventId },
    { linkedEventId: eventId },
  ];
}

function getEventGuests(item: any) {
  const invitation = item?.invitation || null;
  const event = item?.event || item;

  return (
    toNumber(invitation?.estimatedGuestCount, 0) ||
    toNumber(invitation?.estimatedGuests, 0) ||
    toNumber(invitation?.maxGuests, 0) ||
    toNumber(event?.estimatedGuestCount, 0) ||
    toNumber(event?.estimatedGuests, 0) ||
    toNumber(event?.maxGuests, 0) ||
    0
  );
}

function getEventRevenue(item: any) {
  const invitation = item?.invitation || null;
  const event = item?.event || item;

  const paymentStatus =
    cleanString(invitation?.paymentStatus) || cleanString(event?.paymentStatus);

  if (paymentStatus && paymentStatus !== "paid") {
    return 0;
  }

  return Math.max(
    0,
    toNumber(invitation?.budgetTotal, 0) || toNumber(event?.budgetTotal, 0)
  );
}

function getTodayEventStatus(item: any): TodayEventStatus {
  const time = cleanString(item?.time);

  if (!time) {
    return "confirmed";
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  if (time <= currentTime) {
    return "live";
  }

  return "confirmed";
}

function serializeTask(task: any) {
  return {
    id: String(task._id),
    title: task.title || "",
    area: task.area || "",
    due: task.due || "",
    priority: task.priority || "low",
    done: Boolean(task.done),
  };
}

function serializeAlert(alert: any) {
  return {
    id: String(alert._id),
    title: alert.title || "",
    description: alert.description || "",
    tone: alert.tone || "amber",
    type: alert.type || "maintenance",
  };
}

/**
 * Event = מקור אמת לשיוך אולם בלבד
 * Invitation = מקור אמת לפרטי האירוע
 */
function mergeVenueEventWithInvitation(event: any, invitation: any) {
  const invitationDate = normalizeDateOnly(
    invitation?.eventDate || invitation?.date
  );

  const eventDate = normalizeDateOnly(event?.date);

  const date = invitationDate || eventDate;

  const time =
    cleanString(invitation?.eventTime) ||
    cleanString(invitation?.time) ||
    cleanString(event?.time);

  const title =
    cleanString(invitation?.title) ||
    cleanString(invitation?.eventTitle) ||
    cleanString(event?.title) ||
    "אירוע ללא שם";

  const eventType =
    cleanString(invitation?.eventType) ||
    cleanString(event?.eventType) ||
    "wedding";

  const location = invitation?.location || event?.location || null;

  const maxGuests =
    toNumber(invitation?.maxGuests, 0) ||
    toNumber(invitation?.estimatedGuests, 0) ||
    toNumber(invitation?.estimatedGuestCount, 0) ||
    toNumber(event?.maxGuests, 0) ||
    toNumber(event?.estimatedGuests, 0) ||
    toNumber(event?.estimatedGuestCount, 0) ||
    0;

  const budgetTotal =
    toNumber(invitation?.budgetTotal, 0) || toNumber(event?.budgetTotal, 0) || 0;

  const paymentStatus =
    cleanString(invitation?.paymentStatus) ||
    cleanString(event?.paymentStatus) ||
    "paid";

  return {
    id: String(event._id),
    _id: String(event._id),

    event,
    invitation,

    invitationId: invitation?._id ? String(invitation._id) : "",
    shareId: invitation?.shareId || "",

    /**
     * מה-Event בלבד:
     * השיוך לאולם
     */
    venueOwnerId: objectIdString(event.venueOwnerId),
    venueHallId: cleanString(event.venueHallId),
    venueHallName: cleanString(event.venueHallName),
    venueAccessStatus: cleanString(event.venueAccessStatus) || "none",

    /**
     * מה-Invitation קודם:
     * פרטי האירוע האמיתיים
     */
    title,
    eventName: title,
    eventType,
    date,
    time,
    location,
    maxGuests,
    estimatedGuests: maxGuests,
    estimatedGuestCount: maxGuests,
    budgetTotal,
    paymentStatus,

    status: cleanString(event.status) || "active",

    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

function serializeHallWithStats(hall: any, hallEvents: any[]) {
  const today = new Date();
  const todayIso = toDateOnly(today);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const monthStartIso = toDateOnly(monthStart);
  const nextMonthStartIso = toDateOnly(nextMonthStart);

  const monthlyEvents = hallEvents.filter((item) => {
    const date = cleanString(item.date);
    return date >= monthStartIso && date < nextMonthStartIso;
  });

  const upcomingEvents = hallEvents.filter((item) => {
    const date = cleanString(item.date);
    return date >= todayIso;
  });

  const nextEvent = [...upcomingEvents].sort((a, b) => {
    const aKey = `${a.date || ""} ${a.time || ""}`;
    const bKey = `${b.date || ""} ${b.time || ""}`;
    return aKey.localeCompare(bKey);
  })[0];

  const monthlyRevenue = monthlyEvents.reduce((sum, item) => {
    return sum + getEventRevenue(item);
  }, 0);

  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();

  const occupancyRate = daysInMonth
    ? Math.min(100, Math.round((monthlyEvents.length / daysInMonth) * 100))
    : 0;

  return {
    id: String(hall.id || hall._id || ""),
    name: hall.name || "",
    subtitle: hall.subtitle || "",
    capacity: hall.capacity || 0,

    monthlyEvents: monthlyEvents.length,
    upcomingEvents: upcomingEvents.length,
    occupancyRate,
    monthlyRevenue,

    nextEventAt: nextEvent
      ? `${formatShortDate(nextEvent.date)} ${nextEvent.time || ""}`.trim()
      : "",

    status: hall.status || "active",
    image: hall.image || "",
  };
}

async function getInvitationsForEvents(events: any[]) {
  const eventIds = events
    .map((event) => String(event._id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (!eventIds.length) {
    return new Map<string, any>();
  }

  const orQuery = eventIds.flatMap((eventId) => getInvitationIdCandidates(eventId));

  if (!orQuery.length) {
    return new Map<string, any>();
  }

  const invitations = await Invitation.find({
    $or: orQuery,
  })
    .populate("guests")
    .lean();

  const invitationByEventId = new Map<string, any>();

  for (const invitation of invitations) {
    const candidates = [
      invitation.eventId,
      invitation.productionEventId,
      invitation.linkedEventId,
    ];

    for (const candidate of candidates) {
      const key = objectIdString(candidate);

      if (key && !invitationByEventId.has(key)) {
        invitationByEventId.set(key, invitation);
      }
    }
  }

  return invitationByEventId;
}

export async function GET(req: NextRequest) {
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

    const ownerId = auth.userId;

    const halls = await VenueHall.find({ ownerId })
      .sort({ createdAt: 1 })
      .lean();

    /**
     * כאן Event משמש רק לאיתור אירועים ששויכו לבעל אולם.
     * את פרטי האירוע עצמם נמשוך אחר כך מה-Invitation.
     */
    const events = await Event.find({
      venueOwnerId: ownerId,
      venueAccessStatus: "linked",
      status: "active",
    })
      .sort({ createdAt: 1 })
      .lean();

    const invitationByEventId = await getInvitationsForEvents(events);

    const mergedEvents = events.map((event: any) => {
      const invitation = invitationByEventId.get(String(event._id)) || null;

      return mergeVenueEventWithInvitation(event, invitation);
    });

    mergedEvents.sort((a, b) => {
      const aKey = `${a.date || ""} ${a.time || ""}`;
      const bKey = `${b.date || ""} ${b.time || ""}`;
      return aKey.localeCompare(bKey);
    });

    const todayIso = toDateOnly(new Date());

    const todayEventsRaw = mergedEvents
      .filter((event: any) => cleanString(event.date) === todayIso)
      .slice(0, 20);

    const tasks = await VenueTask.find({ ownerId })
      .sort({ done: 1, createdAt: -1 })
      .limit(10)
      .lean();

    const alerts = await VenueAlert.find({
      ownerId,
      read: false,
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    const eventsByHallId = new Map<string, any[]>();

    for (const item of mergedEvents) {
      const hallId = cleanString(item.venueHallId);

      if (!hallId) continue;

      const current = eventsByHallId.get(hallId) || [];
      current.push(item);
      eventsByHallId.set(hallId, current);
    }

    const serializedHalls = halls.map((hall: any) => {
      const hallId = String(hall.id || hall._id || "");
      const hallEvents = eventsByHallId.get(hallId) || [];

      return serializeHallWithStats(hall, hallEvents);
    });

    const hallNameMap = new Map<string, string>();

    for (const hall of halls) {
      const hallId = String(hall.id || hall._id || "");
      hallNameMap.set(hallId, hall.name || "");
    }

    const todayEvents = todayEventsRaw.map((item: any) => {
      const hallId = cleanString(item.venueHallId);
      const hallName =
        cleanString(item.venueHallName) || hallNameMap.get(hallId) || "אולם";

      return {
        id: String(item._id || item.id),
        hallId,
        hallName,
        eventName: item.title || "אירוע ללא שם",
        time: item.time || "",
        status: getTodayEventStatus(item),
      };
    });

    const financeMap = new Map<string, number>();

    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date();
      date.setMonth(date.getMonth() - index);
      financeMap.set(monthLabel(date), 0);
    }

    for (const item of mergedEvents) {
      const dateValue = cleanString(item.date);
      const eventDate = dateValue ? new Date(dateValue) : new Date(item.createdAt);

      if (Number.isNaN(eventDate.getTime())) {
        continue;
      }

      const label = monthLabel(eventDate);

      if (financeMap.has(label)) {
        financeMap.set(label, (financeMap.get(label) || 0) + getEventRevenue(item));
      }
    }

    const financeData = Array.from(financeMap.entries()).map(
      ([label, revenue]) => ({
        label,
        revenue,
      })
    );

    return NextResponse.json({
      success: true,

      halls: serializedHalls,

      todayEvents,

      tasks: tasks.map(serializeTask),

      financeData,

      alerts: alerts.map(serializeAlert),
    });
  } catch (error) {
    console.error("GET /api/venues/dashboard failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "טעינת דשבורד בעלים נכשלה",
      },
      { status: 500 }
    );
  }
}