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

    let totalGuests = 0;
    let paidTotal = 0;
    let budgetTotal = 0;
    const eventsByPeriodMap: Record<string, number> = {};
    const salespersonMap: Record<string, { leads: number; converted: number }> =
      {};

    for (const event of events) {
      totalGuests += Number((event as any).guests || 0);
      paidTotal += Number((event as any).paidAmount || 0);
      budgetTotal += Number((event as any).budget || 0);
      const key = monthKey(String((event as any).date || ""));
      if (key) {
        eventsByPeriodMap[key] = (eventsByPeriodMap[key] || 0) + 1;
      }
    }

    for (const lead of leads) {
      const sp =
        String((lead as any).assignedToName || "").trim() ||
        String((lead as any).salesperson || "").trim() ||
        String((lead as any).ownerName || "").trim() ||
        "לא משויך";
      if (!salespersonMap[sp]) {
        salespersonMap[sp] = { leads: 0, converted: 0 };
      }
      salespersonMap[sp].leads += 1;
      if (
        (lead as any).status === "closed" ||
        Boolean((lead as any).venueEventId || (lead as any).eventId)
      ) {
        salespersonMap[sp].converted += 1;
      }
    }

    const eventsByPeriod = Object.entries(eventsByPeriodMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, count]) => ({ period, count }));

    const salespersonBreakdown = Object.entries(salespersonMap)
      .map(([name, stats]) => ({
        name,
        leads: stats.leads,
        converted: stats.converted,
        conversionRate:
          stats.leads > 0
            ? Math.round((stats.converted / stats.leads) * 100)
            : 0,
      }))
      .sort((a, b) => b.leads - a.leads);

    const format = String(url.searchParams.get("format") || "").toLowerCase();
    if (format === "csv") {
      const rows = [
        ["metric", "value"],
        ["totalLeads", String(totalLeads)],
        ["convertedLeads", String(convertedLeads)],
        ["conversionRate", String(conversionRate)],
        ["totalEvents", String(events.length)],
        ["upcomingCount", String(upcomingCount)],
        ["completedCount", String(completedCount)],
        ["totalGuests", String(totalGuests)],
        ["paidTotal", String(paidTotal)],
        ["budgetTotal", String(budgetTotal)],
        ...eventsByStatusList.map((r) => [
          `events.status.${r.status}`,
          String(r.count),
        ]),
      ];
      const csv = rows
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="venue-${ctx.venueId}-reports.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      reports: {
        leadsByPeriod,
        eventsByPeriod,
        conversionRate,
        totalLeads,
        convertedLeads,
        eventsByStatus: eventsByStatusList,
        upcomingCount,
        completedCount,
        totalEvents: events.length,
        totalGuests,
        paidTotal,
        budgetTotal,
        salespersonBreakdown,
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
