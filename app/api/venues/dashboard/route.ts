import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

import Event from "@/models/Event";
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
  if (!value) return "";

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}

function getEventGuests(event: any) {
  return (
    toNumber(event.estimatedGuestCount, 0) ||
    toNumber(event.estimatedGuests, 0) ||
    toNumber(event.maxGuests, 0) ||
    0
  );
}

function getEventRevenue(event: any) {
  if (event.paymentStatus !== "paid") {
    return 0;
  }

  return Math.max(0, toNumber(event.budgetTotal, 0));
}

function getTodayEventStatus(event: any): TodayEventStatus {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  const eventTime = cleanString(event.time);

  if (!eventTime) {
    return "confirmed";
  }

  if (eventTime <= currentTime) {
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

function serializeHallWithStats(hall: any, hallEvents: any[]) {
  const today = new Date();
  const todayIso = toDateOnly(today);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const monthStartIso = toDateOnly(monthStart);
  const nextMonthStartIso = toDateOnly(nextMonthStart);

  const monthlyEvents = hallEvents.filter((event) => {
    const date = cleanString(event.date);
    return date >= monthStartIso && date < nextMonthStartIso;
  });

  const upcomingEvents = hallEvents.filter((event) => {
    const date = cleanString(event.date);
    return date >= todayIso;
  });

  const nextEvent = [...upcomingEvents].sort((a, b) => {
    const aKey = `${a.date || ""} ${a.time || ""}`;
    const bKey = `${b.date || ""} ${b.time || ""}`;
    return aKey.localeCompare(bKey);
  })[0];

  const monthlyRevenue = monthlyEvents.reduce((sum, event) => {
    return sum + getEventRevenue(event);
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

    const events = await Event.find({
      venueOwnerId: ownerId,
      venueAccessStatus: "linked",
      status: "active",
    })
      .sort({ date: 1, time: 1, createdAt: 1 })
      .lean();

    const todayIso = toDateOnly(new Date());

    const todayEventsRaw = events
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

    for (const event of events) {
      const hallId = cleanString(event.venueHallId);

      if (!hallId) continue;

      const current = eventsByHallId.get(hallId) || [];
      current.push(event);
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

    const todayEvents = todayEventsRaw.map((event: any) => {
      const hallId = cleanString(event.venueHallId);
      const hallName =
        cleanString(event.venueHallName) || hallNameMap.get(hallId) || "אולם";

      return {
        id: String(event._id),
        hallId,
        hallName,
        eventName: event.title || "אירוע ללא שם",
        time: event.time || "",
        status: getTodayEventStatus(event),
      };
    });

    const financeMap = new Map<string, number>();

    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date();
      date.setMonth(date.getMonth() - index);
      financeMap.set(monthLabel(date), 0);
    }

    for (const event of events) {
      const dateValue = cleanString(event.date);
      const eventDate = dateValue ? new Date(dateValue) : new Date(event.createdAt);

      if (Number.isNaN(eventDate.getTime())) {
        continue;
      }

      const label = monthLabel(eventDate);

      if (financeMap.has(label)) {
        financeMap.set(label, (financeMap.get(label) || 0) + getEventRevenue(event));
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