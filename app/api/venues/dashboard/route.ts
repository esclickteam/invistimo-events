import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getUserIdFromRequest } from "@/lib/getUserIdFromRequest";

import VenueHall from "@/models/VenueHall";
import VenueEvent from "@/models/VenueEvent";
import VenueTask from "@/models/VenueTask";
import VenueAlert from "@/models/VenueAlert";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function serializeHall(hall: any) {
  return {
    id: hall.id,
    name: hall.name,
    subtitle: hall.subtitle,
    capacity: hall.capacity || 0,
    monthlyEvents: hall.monthlyEvents || 0,
    upcomingEvents: hall.upcomingEvents || 0,
    occupancyRate: hall.occupancyRate || 0,
    monthlyRevenue: hall.monthlyRevenue || 0,
    nextEventAt: hall.nextEventAt || "",
    status: hall.status || "active",
    image: hall.image || "",
  };
}

function serializeTask(task: any) {
  return {
    id: String(task._id),
    title: task.title,
    area: task.area,
    due: task.due,
    priority: task.priority,
    done: Boolean(task.done),
  };
}

function serializeAlert(alert: any) {
  return {
    id: String(alert._id),
    title: alert.title,
    description: alert.description,
    tone: alert.tone,
    type: alert.type,
  };
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

    const todayIso = new Date().toISOString().slice(0, 10);

    const todayEvents = await VenueEvent.find({
      ownerId,
      date: todayIso,
      status: { $ne: "cancelled" },
    })
      .sort({ time: 1 })
      .limit(20)
      .lean();

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

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const allRevenueEvents = await VenueEvent.find({
      ownerId,
      status: { $ne: "cancelled" },
      createdAt: { $gte: sixMonthsAgo },
    })
      .select("createdAt revenue")
      .lean();

    const financeMap = new Map<string, number>();

    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date();
      date.setMonth(date.getMonth() - index);

      financeMap.set(monthLabel(date), 0);
    }

    for (const event of allRevenueEvents) {
      const label = monthLabel(new Date(event.createdAt));

      if (financeMap.has(label)) {
        financeMap.set(
          label,
          (financeMap.get(label) || 0) + (event.revenue || 0)
        );
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

      halls: halls.map(serializeHall),

      todayEvents: todayEvents.map((event: any) => ({
        id: String(event._id),
        hallId: event.hallId,
        hallName: event.hallName,
        eventName: event.eventName,
        time: event.time,
        status: event.status,
      })),

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