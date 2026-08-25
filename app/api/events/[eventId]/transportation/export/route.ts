import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireTransportationManagement } from "@/lib/guards/requireTransportation";
import TransportRegistration from "@/models/TransportRegistration";
import TransportRoute from "@/models/TransportRoute";
import TransportStop from "@/models/TransportStop";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB();
    const { eventId } = await params;
    const gate = await requireTransportationManagement({ eventId });
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "all"; // all | route | stop | outbound | return | manifest
    const routeId = searchParams.get("routeId");
    const stopId = searchParams.get("stopId");

    const [routes, stops, registrations] = await Promise.all([
      TransportRoute.find({ eventId }).lean(),
      TransportStop.find({ eventId }).lean(),
      TransportRegistration.find({ eventId, status: "registered" }).lean(),
    ]);

    const routeMap = new Map(routes.map((r) => [String(r._id), r]));
    const stopMap = new Map(stops.map((s) => [String(s._id), s]));

    let filtered = registrations;

    if (mode === "outbound") {
      filtered = filtered.filter((r) => r.needsOutbound);
    } else if (mode === "return") {
      filtered = filtered.filter((r) => r.needsReturn);
    } else if ((mode === "route" || mode === "manifest") && routeId) {
      filtered = filtered.filter(
        (r) =>
          String(r.outboundRouteId) === routeId ||
          String(r.returnRouteId) === routeId
      );
    } else if (mode === "stop" && stopId) {
      filtered = filtered.filter(
        (r) =>
          String(r.outboundStopId) === stopId ||
          String(r.returnStopId) === stopId
      );
    }

    const rows = filtered.map((r) => {
      const outRoute = r.outboundRouteId
        ? routeMap.get(String(r.outboundRouteId))
        : null;
      const retRoute = r.returnRouteId
        ? routeMap.get(String(r.returnRouteId))
        : null;
      const outStop = r.outboundStopId
        ? stopMap.get(String(r.outboundStopId))
        : null;
      const retStop = r.returnStopId
        ? stopMap.get(String(r.returnStopId))
        : null;

      const base: Record<string, unknown> = {
        "שם": r.name || "",
        "טלפון": r.phone || "",
        "כמות אנשים": r.passengerCount ?? 1,
        "הלוך": r.needsOutbound ? "כן" : "לא",
        "קו הלוך": outRoute?.name || "",
        "תחנת איסוף": outStop?.name || "",
        "שעת איסוף": outStop?.time || outRoute?.departureTime || "",
        "חזור": r.needsReturn ? "כן" : "לא",
        "קו חזור": retRoute?.name || "",
        "שעת חזור": retRoute?.departureTime || retRoute?.returnTime || "",
        "נקודת הורדה": retStop?.name || "",
        "סטטוס הלוך": r.outboundBoardStatus || "",
        "סטטוס חזור": r.returnBoardStatus || "",
        "הערות": r.notes || "",
      };

      if (mode === "manifest") {
        base["עלה להסעה"] =
          r.outboundBoardStatus === "boarded" ||
          r.returnBoardStatus === "boarded"
            ? "YES"
            : "NO";
      }

      return base;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transport");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const filename = `transport-${mode}-${eventId}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("❌ transport export failed:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
