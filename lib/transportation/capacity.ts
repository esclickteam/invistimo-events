import TransportRegistration from "@/models/TransportRegistration";
import TransportRoute from "@/models/TransportRoute";
import TransportStop from "@/models/TransportStop";
import {
  getCapacityLevel,
  toLegacyCapacityLevel,
  type TransportCapacityLevel,
} from "./types";
import mongoose from "mongoose";

/**
 * Atomic seat reservation on a route.
 * Uses findOneAndUpdate with $expr so two concurrent final-seat requests
 * cannot both succeed.
 */
export async function atomicReserveSeats(params: {
  eventId: string;
  routeId: string;
  seats: number;
}) {
  const seats = Math.max(0, Number(params.seats || 0));
  if (seats === 0) {
    return { ok: true as const, reservedSeats: 0, capacity: 0, remaining: 0 };
  }

  const updated = await TransportRoute.findOneAndUpdate(
    {
      _id: params.routeId,
      eventId: params.eventId,
      active: true,
      $expr: {
        $lte: [{ $add: ["$reservedSeats", seats] }, "$capacity"],
      },
    },
    { $inc: { reservedSeats: seats } },
    { new: true }
  ).lean();

  if (!updated) {
    const route = await TransportRoute.findOne({
      _id: params.routeId,
      eventId: params.eventId,
    }).lean();

    if (!route || !route.active) {
      return {
        ok: false as const,
        code: "ROUTE_NOT_FOUND" as const,
        message: "Route not found",
        remaining: 0,
        capacity: 0,
        reservedSeats: 0,
        requested: seats,
      };
    }

    const reservedSeats = Number(route.reservedSeats || 0);
    const capacity = Number(route.capacity || 0);
    const remaining = Math.max(0, capacity - reservedSeats);

    return {
      ok: false as const,
      code: "ROUTE_FULL" as const,
      message:
        remaining > 0
          ? `נשארו רק ${remaining} מקומות בקו הזה`
          : "הקו מלא",
      remaining,
      capacity,
      reservedSeats,
      requested: seats,
    };
  }

  const reservedSeats = Number(updated.reservedSeats || 0);
  const capacity = Number(updated.capacity || 0);

  return {
    ok: true as const,
    reservedSeats,
    capacity,
    remaining: Math.max(0, capacity - reservedSeats),
    level: getCapacityLevel(reservedSeats, capacity),
  };
}

export async function atomicReleaseSeats(params: {
  eventId: string;
  routeId: string;
  seats: number;
}) {
  const seats = Math.max(0, Number(params.seats || 0));
  if (!params.routeId || seats === 0) {
    return { ok: true as const };
  }

  await TransportRoute.findOneAndUpdate(
    {
      _id: params.routeId,
      eventId: params.eventId,
    },
    [
      {
        $set: {
          reservedSeats: {
            $max: [0, { $subtract: ["$reservedSeats", seats] }],
          },
        },
      },
    ]
  );

  return { ok: true as const };
}

/**
 * Adjust seats on the same route by delta (positive = reserve more).
 * Atomic; fails if increasing beyond capacity.
 */
export async function atomicAdjustSeats(params: {
  eventId: string;
  routeId: string;
  delta: number;
}) {
  const delta = Number(params.delta || 0);
  if (delta === 0) return { ok: true as const };
  if (delta > 0) {
    return atomicReserveSeats({
      eventId: params.eventId,
      routeId: params.routeId,
      seats: delta,
    });
  }
  await atomicReleaseSeats({
    eventId: params.eventId,
    routeId: params.routeId,
    seats: Math.abs(delta),
  });
  return { ok: true as const };
}

export async function getRouteAvailability(
  eventId: string,
  routeId: string
) {
  const route = await TransportRoute.findOne({
    _id: routeId,
    eventId,
  }).lean();

  if (!route) {
    return null;
  }

  const reservedSeats = Number(route.reservedSeats || 0);
  const capacity = Number(route.capacity || 0);
  const remaining = Math.max(0, capacity - reservedSeats);

  return {
    routeId: String(route._id),
    name: route.name,
    direction: route.direction,
    capacity,
    reservedSeats,
    remaining,
    level: getCapacityLevel(reservedSeats, capacity),
    full: remaining <= 0,
    active: Boolean(route.active),
  };
}

/** Recount registered seats for a route (source of truth repair). */
export async function recountRouteReservedSeats(
  eventId: string,
  routeId: string
) {
  const route = await TransportRoute.findOne({
    _id: routeId,
    eventId,
  }).lean();
  if (!route) return 0;

  const filter: Record<string, unknown> = {
    eventId,
    status: "registered",
  };

  if (route.direction === "return") {
    filter.needsReturn = true;
    filter.returnRouteId = routeId;
  } else {
    // outbound + round_trip: seats reserved via outbound bookings on this route
    filter.needsOutbound = true;
    filter.outboundRouteId = routeId;
  }

  // For return direction of round_trip used as returnRouteId:
  if (route.direction === "round_trip") {
    // Round-trip bus capacity is tracked separately for outbound vs return
    // when the same route id is used in either field.
    // We store reservedSeats as outbound count on the route document;
    // return bookings on a round_trip route also consume the same counter
    // only when returnRouteId === this route AND needsReturn (independent flow
    // usually uses dedicated return routes).
  }

  const rows = await TransportRegistration.find(filter)
    .select("passengerCount")
    .lean();

  let total = rows.reduce((sum, row) => sum + Number(row.passengerCount || 0), 0);

  // Also count return bookings that point at this route (for return / round_trip)
  if (route.direction === "return" || route.direction === "round_trip") {
    const returnRows = await TransportRegistration.find({
      eventId,
      status: "registered",
      needsReturn: true,
      returnRouteId: routeId,
      // avoid double-count if already counted as outbound on same route
      ...(route.direction === "round_trip"
        ? {
            $or: [
              { needsOutbound: false },
              { outboundRouteId: { $ne: routeId } },
            ],
          }
        : {}),
    })
      .select("passengerCount")
      .lean();

    if (route.direction === "return") {
      total = returnRows.reduce(
        (sum, row) => sum + Number(row.passengerCount || 0),
        0
      );
    } else {
      total += returnRows.reduce(
        (sum, row) => sum + Number(row.passengerCount || 0),
        0
      );
    }
  }

  await TransportRoute.updateOne(
    { _id: routeId, eventId },
    { $set: { reservedSeats: total } }
  );

  return total;
}

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

/**
 * Reserve seats for a registration payload (outbound and/or return independently).
 * Rolls back outbound if return fails.
 */
export async function reserveForRegistration(params: {
  eventId: string;
  passengerCount: number;
  needsOutbound: boolean;
  outboundRouteId?: string | null;
  needsReturn: boolean;
  returnRouteId?: string | null;
}) {
  const count = Math.max(1, Number(params.passengerCount || 1));
  let outboundReserved = false;

  if (params.needsOutbound) {
    if (!params.outboundRouteId) {
      return {
        ok: false as const,
        code: "OUTBOUND_ROUTE_REQUIRED" as const,
        remaining: 0,
      };
    }
    const out = await atomicReserveSeats({
      eventId: params.eventId,
      routeId: String(params.outboundRouteId),
      seats: count,
    });
    if (!out.ok) return out;
    outboundReserved = true;
  }

  if (params.needsReturn) {
    if (!params.returnRouteId) {
      if (outboundReserved && params.outboundRouteId) {
        await atomicReleaseSeats({
          eventId: params.eventId,
          routeId: String(params.outboundRouteId),
          seats: count,
        });
      }
      return {
        ok: false as const,
        code: "RETURN_ROUTE_REQUIRED" as const,
        remaining: 0,
      };
    }
    const ret = await atomicReserveSeats({
      eventId: params.eventId,
      routeId: String(params.returnRouteId),
      seats: count,
    });
    if (!ret.ok) {
      if (outboundReserved && params.outboundRouteId) {
        await atomicReleaseSeats({
          eventId: params.eventId,
          routeId: String(params.outboundRouteId),
          seats: count,
        });
      }
      return ret;
    }
  }

  return { ok: true as const };
}

export async function releaseForRegistration(reg: {
  eventId: any;
  passengerCount?: number;
  needsOutbound?: boolean;
  outboundRouteId?: any;
  needsReturn?: boolean;
  returnRouteId?: any;
  status?: string;
}) {
  if (reg.status && reg.status !== "registered") return;

  const eventId = String(reg.eventId);
  const count = Math.max(0, Number(reg.passengerCount || 0));
  if (count <= 0) return;

  if (reg.needsOutbound && reg.outboundRouteId) {
    await atomicReleaseSeats({
      eventId,
      routeId: String(reg.outboundRouteId),
      seats: count,
    });
  }
  if (reg.needsReturn && reg.returnRouteId) {
    await atomicReleaseSeats({
      eventId,
      routeId: String(reg.returnRouteId),
      seats: count,
    });
  }
}

/**
 * Move/edit reservation seats atomically.
 * Releases old seats first only after new seats are reserved when increasing,
 * or releases delta when decreasing / changing routes.
 */
export async function rebalanceRegistrationSeats(params: {
  eventId: string;
  previous: {
    passengerCount: number;
    needsOutbound: boolean;
    outboundRouteId?: string | null;
    needsReturn: boolean;
    returnRouteId?: string | null;
    status: string;
  };
  next: {
    passengerCount: number;
    needsOutbound: boolean;
    outboundRouteId?: string | null;
    needsReturn: boolean;
    returnRouteId?: string | null;
  };
}) {
  const prev = params.previous;
  const next = params.next;

  // If previous wasn't holding seats, just reserve next
  if (prev.status !== "registered") {
    return reserveForRegistration({
      eventId: params.eventId,
      ...next,
    });
  }

  const prevCount = Number(prev.passengerCount || 0);
  const nextCount = Number(next.passengerCount || 0);

  // Same outbound route — adjust delta
  const prevOut = prev.needsOutbound ? String(prev.outboundRouteId || "") : "";
  const nextOut = next.needsOutbound ? String(next.outboundRouteId || "") : "";
  const prevRet = prev.needsReturn ? String(prev.returnRouteId || "") : "";
  const nextRet = next.needsReturn ? String(next.returnRouteId || "") : "";

  // Outbound
  if (prevOut && nextOut && prevOut === nextOut) {
    const delta = nextCount - prevCount;
    const adj = await atomicAdjustSeats({
      eventId: params.eventId,
      routeId: nextOut,
      delta,
    });
    if (!adj.ok) return adj;
  } else {
    if (nextOut) {
      const res = await atomicReserveSeats({
        eventId: params.eventId,
        routeId: nextOut,
        seats: nextCount,
      });
      if (!res.ok) return res;
    }
    if (prevOut) {
      await atomicReleaseSeats({
        eventId: params.eventId,
        routeId: prevOut,
        seats: prevCount,
      });
    }
  }

  // Return
  if (prevRet && nextRet && prevRet === nextRet) {
    const delta = nextCount - prevCount;
    const adj = await atomicAdjustSeats({
      eventId: params.eventId,
      routeId: nextRet,
      delta,
    });
    if (!adj.ok) {
      // rollback outbound delta if we changed it
      if (prevOut && nextOut && prevOut === nextOut) {
        await atomicAdjustSeats({
          eventId: params.eventId,
          routeId: nextOut,
          delta: prevCount - nextCount,
        });
      }
      return adj;
    }
  } else {
    if (nextRet) {
      const res = await atomicReserveSeats({
        eventId: params.eventId,
        routeId: nextRet,
        seats: nextCount,
      });
      if (!res.ok) {
        if (prevOut && nextOut && prevOut === nextOut) {
          await atomicAdjustSeats({
            eventId: params.eventId,
            routeId: nextOut,
            delta: prevCount - nextCount,
          });
        } else if (nextOut && (!prevOut || prevOut !== nextOut)) {
          await atomicReleaseSeats({
            eventId: params.eventId,
            routeId: nextOut,
            seats: nextCount,
          });
          if (prevOut) {
            await atomicReserveSeats({
              eventId: params.eventId,
              routeId: prevOut,
              seats: prevCount,
            });
          }
        }
        return res;
      }
    }
    if (prevRet) {
      await atomicReleaseSeats({
        eventId: params.eventId,
        routeId: prevRet,
        seats: prevCount,
      });
    }
  }

  return { ok: true as const };
}

export type RouteCapacitySummary = {
  routeId: string;
  name: string;
  direction: string;
  capacity: number;
  registered: number;
  remaining: number;
  level: TransportCapacityLevel;
  legacyLevel: "ok" | "warning_80" | "warning_90" | "full";
  active: boolean;
  status: string;
  departureTime?: string;
  returnTime?: string;
  waitlistedCount: number;
  waitlistedPassengers: number;
  companyName?: string;
  driverName?: string;
  vehicleNumber?: string;
};

export async function buildEventTransportSummary(eventId: string) {
  const [routes, stops, registrations, waitlisted] = await Promise.all([
    TransportRoute.find({ eventId }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
    TransportStop.find({ eventId }).sort({ sortOrder: 1 }).lean(),
    TransportRegistration.find({ eventId, status: "registered" }).lean(),
    TransportRegistration.find({ eventId, status: "waitlisted" })
      .sort({ createdAt: 1 })
      .lean(),
  ]);

  const routeSummaries: RouteCapacitySummary[] = routes.map((route) => {
    const routeId = String(route._id);
    const reservedSeats = Number(route.reservedSeats || 0);
    const capacity = Number(route.capacity || 0);
    const level = getCapacityLevel(reservedSeats, capacity);

    const routeWaitlisted = waitlisted.filter(
      (w) =>
        String(w.outboundRouteId) === routeId ||
        String(w.returnRouteId) === routeId
    );

    return {
      routeId,
      name: route.name,
      direction: route.direction,
      capacity,
      registered: reservedSeats,
      remaining: Math.max(0, capacity - reservedSeats),
      level,
      legacyLevel: toLegacyCapacityLevel(level),
      active: Boolean(route.active),
      status: route.status,
      departureTime: route.departureTime || "",
      returnTime: route.returnTime || "",
      waitlistedCount: routeWaitlisted.length,
      waitlistedPassengers: routeWaitlisted.reduce(
        (s, w) => s + Number(w.passengerCount || 0),
        0
      ),
      companyName: route.companyName || "",
      driverName: route.driverName || "",
      vehicleNumber: route.vehicleNumber || "",
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
    (r) => r.active && (r.level === "almost_full" || r.level === "filling")
  ).length;

  const issues: string[] = [];
  for (const r of routeSummaries) {
    if (!r.active) continue;
    if (r.level === "full") {
      issues.push(`קו מלא: ${r.name}`);
      if (r.waitlistedPassengers > 0) {
        issues.push(
          `נפתחו מקומות? ${r.name} מלא — ${r.waitlistedPassengers} בהמתנה`
        );
      }
    }
    if (r.level === "almost_full") issues.push(`קו כמעט מלא: ${r.name}`);
  }

  // Freed seats vs waitlist opportunities
  const waitlistOpportunities = routeSummaries
    .filter((r) => r.active && r.remaining > 0 && r.waitlistedPassengers > 0)
    .map((r) => ({
      routeId: r.routeId,
      name: r.name,
      remaining: r.remaining,
      waitlistedCount: r.waitlistedCount,
      waitlistedPassengers: r.waitlistedPassengers,
      message: `נפתחו ${r.remaining} מקומות — יש ${r.waitlistedCount} ברשימת המתנה`,
    }));

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
    waitlistedCount: waitlisted.length,
    waitlistedPassengers: waitlisted.reduce(
      (s, w) => s + Number(w.passengerCount || 0),
      0
    ),
    fullRoutes,
    almostFullRoutes,
    issues,
    waitlistOpportunities,
    routes: routeSummaries,
    stops: stopCounts,
    waitlist: waitlisted.map((w) => ({
      _id: String(w._id),
      name: w.name,
      phone: w.phone || "",
      passengerCount: w.passengerCount,
      needsOutbound: w.needsOutbound,
      outboundRouteId: w.outboundRouteId ? String(w.outboundRouteId) : null,
      outboundStopId: w.outboundStopId ? String(w.outboundStopId) : null,
      needsReturn: w.needsReturn,
      returnRouteId: w.returnRouteId ? String(w.returnRouteId) : null,
      returnStopId: w.returnStopId ? String(w.returnStopId) : null,
      notes: w.notes || "",
      createdAt: w.createdAt,
    })),
  };
}

export function toObjectId(id: string | undefined | null) {
  if (!id) return null;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}
