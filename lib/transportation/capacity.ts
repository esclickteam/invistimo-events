import TransportRegistration from "@/models/TransportRegistration";
import TransportRoute from "@/models/TransportRoute";
import TransportStop from "@/models/TransportStop";
import { getCapacityLevel, type TransportCapacityLevel } from "./types";
import mongoose from "mongoose";

export async function countRoutePassengers(
  eventId: string,
  routeId: string,
  direction: "outbound" | "return"
) {
  const filter: Record<string, unknown> = {
    eventId,
    status: "registered",
  };

  if (direction === "outbound") {
    filter.needsOutbound = true;
    filter.outboundRouteId = routeId;
  } else {
    filter.needsReturn = true;
    filter.returnRouteId = routeId;
  }

  const rows = await TransportRegistration.find(filter)
    .select("passengerCount")
    .lean();

  return rows.reduce((sum, row) => sum + Number(row.passengerCount || 0), 0);
}

export async function assertRouteHasCapacity(params: {
  eventId: string;
  routeId: string;
  direction: "outbound" | "return";
  passengerCount: number;
  excludeRegistrationId?: string;
}) {
  const route = await TransportRoute.findOne({
    _id: params.routeId,
    eventId: params.eventId,
    active: true,
  }).lean();

  if (!route) {
    return {
      ok: false as const,
      code: "ROUTE_NOT_FOUND",
      message: "Route not found",
    };
  }

  const current = await countRoutePassengers(
    params.eventId,
    params.routeId,
    params.direction
  );

  let adjusted = current;
  if (params.excludeRegistrationId) {
    const existing = await TransportRegistration.findById(
      params.excludeRegistrationId
    )
      .select(
        "passengerCount needsOutbound outboundRouteId needsReturn returnRouteId status"
      )
      .lean();

    if (existing && existing.status === "registered") {
      const wasOnRoute =
        params.direction === "outbound"
          ? existing.needsOutbound &&
            String(existing.outboundRouteId) === String(params.routeId)
          : existing.needsReturn &&
            String(existing.returnRouteId) === String(params.routeId);

      if (wasOnRoute) {
        adjusted -= Number(existing.passengerCount || 0);
      }
    }
  }

  const next = adjusted + Number(params.passengerCount || 0);
  const capacity = Number(route.capacity || 0);

  if (next > capacity) {
    return {
      ok: false as const,
      code: "ROUTE_FULL",
      message: "Route is at full capacity",
      registered: adjusted,
      capacity,
      requested: params.passengerCount,
    };
  }

  return {
    ok: true as const,
    registered: adjusted,
    capacity,
    level: getCapacityLevel(next, capacity),
  };
}

export type RouteCapacitySummary = {
  routeId: string;
  name: string;
  direction: string;
  capacity: number;
  registered: number;
  remaining: number;
  level: TransportCapacityLevel;
  active: boolean;
  status: string;
  departureTime?: string;
  returnTime?: string;
};

export async function buildEventTransportSummary(eventId: string) {
  const [routes, stops, registrations] = await Promise.all([
    TransportRoute.find({ eventId }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
    TransportStop.find({ eventId }).sort({ sortOrder: 1 }).lean(),
    TransportRegistration.find({ eventId, status: "registered" }).lean(),
  ]);

  const routeSummaries: RouteCapacitySummary[] = routes.map((route) => {
    const routeId = String(route._id);
    let registered = 0;

    for (const reg of registrations) {
      const count = Number(reg.passengerCount || 0);
      if (
        (route.direction === "outbound" || route.direction === "round_trip") &&
        reg.needsOutbound &&
        String(reg.outboundRouteId) === routeId
      ) {
        registered += count;
      }
      if (
        (route.direction === "return" || route.direction === "round_trip") &&
        reg.needsReturn &&
        String(reg.returnRouteId) === routeId
      ) {
        // For round_trip same vehicle both ways: count outbound toward capacity
        // for outbound direction display; for pure return routes count return.
        if (route.direction === "return") {
          registered += count;
        } else if (
          route.direction === "round_trip" &&
          String(reg.outboundRouteId) !== routeId
        ) {
          registered += count;
        }
      }
    }

    // Pure round_trip: capacity is primarily outbound seats on that bus.
    if (route.direction === "round_trip") {
      registered = registrations
        .filter(
          (r) => r.needsOutbound && String(r.outboundRouteId) === routeId
        )
        .reduce((s, r) => s + Number(r.passengerCount || 0), 0);
    }

    const capacity = Number(route.capacity || 0);
    return {
      routeId,
      name: route.name,
      direction: route.direction,
      capacity,
      registered,
      remaining: Math.max(0, capacity - registered),
      level: getCapacityLevel(registered, capacity),
      active: Boolean(route.active),
      status: route.status,
      departureTime: route.departureTime || "",
      returnTime: route.returnTime || "",
    };
  });

  let outboundPassengers = 0;
  let returnPassengers = 0;
  let totalSeats = 0;
  let totalRegisteredSeats = 0;

  for (const summary of routeSummaries) {
    if (!summary.active) continue;
    totalSeats += summary.capacity;
    totalRegisteredSeats += summary.registered;
  }

  for (const reg of registrations) {
    const count = Number(reg.passengerCount || 0);
    if (reg.needsOutbound) outboundPassengers += count;
    if (reg.needsReturn) returnPassengers += count;
  }

  const fullRoutes = routeSummaries.filter(
    (r) => r.active && r.level === "full"
  ).length;
  const almostFullRoutes = routeSummaries.filter(
    (r) => r.active && (r.level === "warning_80" || r.level === "warning_90")
  ).length;

  const issues: string[] = [];
  for (const r of routeSummaries) {
    if (!r.active) continue;
    if (r.level === "full") issues.push(`קו מלא: ${r.name}`);
    if (r.level === "warning_90") issues.push(`קו כמעט מלא (90%): ${r.name}`);
    if (r.level === "warning_80") issues.push(`קו ב-80%: ${r.name}`);
  }

  const stopCounts = stops.map((stop) => {
    const stopId = String(stop._id);
    const expected = registrations
      .filter(
        (r) =>
          (r.needsOutbound && String(r.outboundStopId) === stopId) ||
          (r.needsReturn && String(r.returnStopId) === stopId)
      )
      .reduce((s, r) => s + Number(r.passengerCount || 0), 0);

    const boarded = registrations
      .filter((r) => {
        if (r.needsOutbound && String(r.outboundStopId) === stopId) {
          return r.outboundBoardStatus === "boarded";
        }
        if (r.needsReturn && String(r.returnStopId) === stopId) {
          return r.returnBoardStatus === "boarded";
        }
        return false;
      })
      .reduce((s, r) => s + Number(r.passengerCount || 0), 0);

    return {
      stopId,
      routeId: String(stop.routeId),
      name: stop.name,
      time: stop.time || "",
      sortOrder: stop.sortOrder,
      expected,
      boarded,
      missing: Math.max(0, expected - boarded),
    };
  });

  return {
    routeCount: routes.filter((r) => r.active).length,
    totalSeats,
    totalRegistered: totalRegisteredSeats,
    remainingSeats: Math.max(0, totalSeats - totalRegisteredSeats),
    outboundPassengers,
    returnPassengers,
    registrationCount: registrations.length,
    fullRoutes,
    almostFullRoutes,
    issues,
    routes: routeSummaries,
    stops: stopCounts,
  };
}

export function toObjectId(id: string | undefined | null) {
  if (!id) return null;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}
