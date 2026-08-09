import { NextRequest, NextResponse } from "next/server";
import VenueLead from "@/models/VenueLead";
import { connectDB } from "@/lib/db";
import { requireVenueAccess } from "@/lib/venues/requireVenueAccess";
import { listVenueEventsForHall } from "@/lib/venues/venueEventsService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ hallId: string }>;
};

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthKey(dateStr: string) {
  if (!dateStr || dateStr.length < 7) return null;
  return dateStr.slice(0, 7);
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    await connectDB();
    const { hallId } = await params;
    const { ctx, error } = await requireVenueAccess(req, hallId, "reports.view");
    if (error || !ctx) return error!;

    const url = new URL(req.url);
    const monthsBack = Math.min(
      12,
      Math.max(1, Number(url.searchParams.get("months")) || 6)
    );

    const now = new Date();
    const today = toYmd(now);

    const periodStart = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
    const periodFrom = toYmd(periodStart);

    const [leads, events] = await Promise.all([
      VenueLead.find({
        hallId: ctx.venueId,
        ownerId: ctx.ownerId,
      }).lean(),
      listVenueEventsForHall({
        ownerId: ctx.ownerId,
        venueId: ctx.venueId,
        hall: ctx.hall,
      }),
    ]);

    const leadsByMonth: Record<string, number> = {};
    const convertedByMonth: Record<string, number> = {};

    for (const lead of leads) {
      const created = (lead as any).createdAt
        ? toYmd(new Date((lead as any).createdAt))
        : "";
      const key = monthKey(created);
      if (key && created >= periodFrom) {
        leadsByMonth[key] = (leadsByMonth[key] || 0) + 1;
      }
      if ((lead as any).status === "closed" || (lead as any).venueEventId) {
        const closedDate =
          (lead as any).updatedAt
            ? toYmd(new Date((lead as any).updatedAt))
            : created;
        const closedKey = monthKey(closedDate);
        if (closedKey && closedDate >= periodFrom) {
          convertedByMonth[closedKey] = (convertedByMonth[closedKey] || 0) + 1;
        }
      }
    }

    const leadsByPeriod = Object.entries(leadsByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, count]) => ({ period, count }));

    const totalLeads = leads.length;
    const convertedLeads = leads.filter(
      (l) =>
        (l as any).status === "closed" ||
        Boolean((l as any).venueEventId || (l as any).eventId)
    ).length;
    const conversionRate =
      totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    const eventsByStatus: Record<string, number> = {};
    let upcomingCount = 0;
    let completedCount = 0;

    for (const event of events) {
      const status = String((event as any).status || "confirmed");
      eventsByStatus[status] = (eventsByStatus[status] || 0) + 1;

      const date = String((event as any).date || "");
      if (date >= today && status !== "cancelled" && status !== "done") {
        upcomingCount += 1;
      }
      if (status === "done" || (date && date < today && status !== "cancelled")) {
        completedCount += 1;
      }
    }

    const eventsByStatusList = Object.entries(eventsByStatus).map(
      ([status, count]) => ({ status, count })
    );

    return NextResponse.json({
      success: true,
      reports: {
        leadsByPeriod,
        conversionRate,
        totalLeads,
        convertedLeads,
        eventsByStatus: eventsByStatusList,
        upcomingCount,
        completedCount,
        totalEvents: events.length,
        periodFrom,
        periodMonths: monthsBack,
      },
    });
  } catch (err) {
    console.error("GET reports failed:", err);
    return NextResponse.json(
      { success: false, message: "טעינת דוחות נכשלה" },
      { status: 500 }
    );
  }
}
