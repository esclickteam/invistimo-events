import TransportRegistration from "@/models/TransportRegistration";
import TransportRoute from "@/models/TransportRoute";
import TransportStop from "@/models/TransportStop";
import {
  getCapacityLevel,
  toLegacyCapacityLevel,
  type TransportCapacityLevel,
} from "./types";
import mongoose from "mongoose";

export type SeatLeg = "outbound" | "return";

function usesReturnCounters(route: {
  direction?: string;
}): boolean {
  return route.direction === "round_trip";
}

function legFields(leg: SeatLeg, route: { direction?: string }) {
  const returnLeg = leg === "return" && usesReturnCounters(route);
  return {
    reservedField: returnLeg ? "returnReservedSeats" : "reservedSeats",
    capacityField: returnLeg ? "returnCapacity" : "capacity",
  } as const;
}

/**
 * Atomic seat reservation on a route leg.
 * For round_trip routes, outbound and return use independent counters.
 */
export async function atomicReserveSeats(params: {
  eventId: string;
  routeId: string;
  seats: number;
  leg?: SeatLeg;
}) {
  const seats = Math.max(0, Number(params.seats || 0));
  const leg: SeatLeg = params.leg || "outbound";
  if (seats === 0) {
    return { ok: true as const, reservedSeats: 0, capacity: 0, remaining: 0, leg };
  }

  const existing = await TransportRoute.findOne({
    _id: params.routeId,
    eventId: params.eventId,
  }).lean();

  if (!existing) {
    return {
      ok: false as const,
      code: "ROUTE_NOT_FOUND" as const,
      message: "Route not found",
      remaining: 0,
      capacity: 0,
      reservedSeats: 0,
      requested: seats,
      leg,
    };
  }

  const { reservedField, capacityField } = legFields(leg, existing);

  const updated = await TransportRoute.findOneAndUpdate(
    {
      _id: params.routeId,
      eventId: params.eventId,
      active: true,
      $expr: {
        $lte: [{ $add: [`$${reservedField}`, seats] }, `$${capacityField}`],
      },
    },
    { $inc: { [reservedField]: seats } },
    { new: true }
  ).lean();

  if (!updated) {
    if (!existing.active) {
      return {
        ok: false as const,
        code: "ROUTE_NOT_FOUND" as const,
        message: "Route not found",
        remaining: 0,
        capacity: 0,
        reservedSeats: 0,
        requested: seats,
        leg,
      };
    }

    const reservedSeats = Number((existing as any)[reservedField] || 0);
    const capacity = Number((existing as any)[capacityField] || 0);
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
      leg,
    };
  }

  const reservedSeats = Number((updated as any)[reservedField] || 0);
  const capacity = Number((updated as any)[capacityField] || 0);

  return {
    ok: true as const,
    reservedSeats,
    capacity,
    remaining: Math.max(0, capacity - reservedSeats),
    level: getCapacityLevel(reservedSeats, capacity),
    leg,
  };
}

export async function atomicReleaseSeats(params: {
  eventId: string;
  routeId: string;
  seats: number;
  leg?: SeatLeg;
}) {
  const seats = Math.max(0, Number(params.seats || 0));
  const leg: SeatLeg = params.leg || "outbound";
  if (!params.routeId || seats === 0) {
    return { ok: true as const };
  }

  const route = await TransportRoute.findOne({
    _id: params.routeId,
    eventId: params.eventId,
  })
    .select("direction")
    .lean();

  if (!route) return { ok: true as const };

  const { reservedField } = legFields(leg, route);

  await TransportRoute.findOneAndUpdate(
    {
      _id: params.routeId,
      eventId: params.eventId,
    },
    [
      {
        $set: {
          [reservedField]: {
            $max: [0, { $subtract: [`$${reservedField}`, seats] }],
          },
        },
      },
    ]
  );

  return { ok: true as const };
}

/**
 * Adjust seats on the same route leg by delta (positive = reserve more).
 */
export async function atomicAdjustSeats(params: {
  eventId: string;
  routeId: string;
  delta: number;
  leg?: SeatLeg;
}) {
  const delta = Number(params.delta || 0);
  const leg: SeatLeg = params.leg || "outbound";
  if (delta === 0) return { ok: true as const };
  if (delta > 0) {
    return atomicReserveSeats({
      eventId: params.eventId,
      routeId: params.routeId,
      seats: delta,
      leg,
    });
  }
  await atomicReleaseSeats({
    eventId: params.eventId,
    routeId: params.routeId,
    seats: Math.abs(delta),
    leg,
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

  const returnCapacity =
    route.direction === "round_trip"
      ? Number(route.returnCapacity ?? route.capacity ?? 0)
      : Number(route.capacity || 0);
  const returnReservedSeats =
    route.direction === "round_trip"
      ? Number(route.returnReservedSeats || 0)
      : Number(route.reservedSeats || 0);
  const returnRemaining = Math.max(0, returnCapacity - returnReservedSeats);

  return {
    routeId: String(route._id),
    name: route.name,
    direction: route.direction,
    capacity,
    reservedSeats,
    remaining,
    level: getCapacityLevel(reservedSeats, capacity),
    full: remaining <= 0,
    returnCapacity,
    returnReservedSeats,
    returnRemaining,
    returnLevel: getCapacityLevel(returnReservedSeats, returnCapacity),
    returnFull: returnRemaining <= 0,
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

  if (route.direction === "return") {
    const returnRows = await TransportRegistration.find({
      eventId,
      status: "registered",
      needsReturn: true,
      returnRouteId: routeId,
    })
      .select("passengerCount")
      .lean();
    const total = returnRows.reduce(
      (sum, row) => sum + Number(row.passengerCount || 0),
      0
    );
    await TransportRoute.updateOne(
      { _id: routeId, eventId },
      { $set: { reservedSeats: total, returnReservedSeats: 0 } }
    );
    return total;
  }

  const outboundRows = await TransportRegistration.find({
    eventId,
    status: "registered",
    needsOutbound: true,
    outboundRouteId: routeId,
  })
    .select("passengerCount")
    .lean();
  const outboundTotal = outboundRows.reduce(
    (sum, row) => sum + Number(row.passengerCount || 0),
    0
  );

  if (route.direction === "round_trip") {
    const returnRows = await TransportRegistration.find({
      eventId,
      status: "registered",
      needsReturn: true,
      returnRouteId: routeId,
    })
      .select("passengerCount")
      .lean();
    const returnTotal = returnRows.reduce(
      (sum, row) => sum + Number(row.passengerCount || 0),
      0
    );
    await TransportRoute.updateOne(
      { _id: routeId, eventId },
      {
        $set: {
          reservedSeats: outboundTotal,
          returnReservedSeats: returnTotal,
        },
      }
    );
    return outboundTotal + returnTotal;
  }

  await TransportRoute.updateOne(
    { _id: routeId, eventId },
    { $set: { reservedSeats: outboundTotal, returnReservedSeats: 0 } }
  );
  return outboundTotal;
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
      leg: "outbound",
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
          leg: "outbound",
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
      leg: "return",
    });
    if (!ret.ok) {
      if (outboundReserved && params.outboundRouteId) {
        await atomicReleaseSeats({
          eventId: params.eventId,
          routeId: String(params.outboundRouteId),
          seats: count,
          leg: "outbound",
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
      leg: "outbound",
    });
  }
  if (reg.needsReturn && reg.returnRouteId) {
    await atomicReleaseSeats({
      eventId,
      routeId: String(reg.returnRouteId),
      seats: count,
      leg: "return",
    });
  }
}

/**
 * Move/edit reservation seats atomically.
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

  if (prev.status !== "registered") {
    return reserveForRegistration({
      eventId: params.eventId,
      ...next,
    });
  }

  const prevCount = Number(prev.passengerCount || 0);
  const nextCount = Number(next.passengerCount || 0);

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
      leg: "outbound",
    });
    if (!adj.ok) return adj;
  } else {
    if (nextOut) {
      const res = await atomicReserveSeats({
        eventId: params.eventId,
        routeId: nextOut,
        seats: nextCount,
        leg: "outbound",
      });
      if (!res.ok) return res;
    }
    if (prevOut) {
      await atomicReleaseSeats({
        eventId: params.eventId,
        routeId: prevOut,
        seats: prevCount,
        leg: "outbound",
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
      leg: "return",
    });
    if (!adj.ok) {
      if (prevOut && nextOut && prevOut === nextOut) {
        await atomicAdjustSeats({
          eventId: params.eventId,
          routeId: nextOut,
          delta: prevCount - nextCount,
          leg: "outbound",
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
        leg: "return",
      });
      if (!res.ok) {
        if (prevOut && nextOut && prevOut === nextOut) {
          await atomicAdjustSeats({
            eventId: params.eventId,
            routeId: nextOut,
            delta: prevCount - nextCount,
            leg: "outbound",
          });
        } else if (nextOut && (!prevOut || prevOut !== nextOut)) {
          await atomicReleaseSeats({
            eventId: params.eventId,
            routeId: nextOut,
            seats: nextCount,
            leg: "outbound",
          });
          if (prevOut) {
            await atomicReserveSeats({
              eventId: params.eventId,
              routeId: prevOut,
              seats: prevCount,
              leg: "outbound",
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
        leg: "return",
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
  returnCapacity: number;
  returnRegistered: number;
  returnRemaining: number;
  level: TransportCapacityLevel;
  returnLevel: TransportCapacityLevel;
  legacyLevel: "ok" | "warning_80" | "warning_90" | "full";
  active: boolean;
  status: string;
  departureTime?: string;
  returnTime?: string;
  waitlistedCount: number;
  waitlistedPassengers: number;
  stopCount: number;
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

  const stopsByRoute = new Map<string, number>();
  for (const stop of stops) {
    const key = String(stop.routeId);
    stopsByRoute.set(key, (stopsByRoute.get(key) || 0) + 1);
  }

  const routeSummaries: RouteCapacitySummary[] = routes.map((route) => {
    const routeId = String(route._id);
    const reservedSeats = Number(route.reservedSeats || 0);
    const capacity = Number(route.capacity || 0);
    const level = getCapacityLevel(reservedSeats, capacity);

    const returnCapacity =
      route.direction === "round_trip"
        ? Number(route.returnCapacity ?? route.capacity ?? 0)
        : capacity;
    const returnRegistered =
      route.direction === "round_trip"
        ? Number(route.returnReservedSeats || 0)
        : route.direction === "return"
          ? reservedSeats
          : 0;
    const returnRemaining = Math.max(0, returnCapacity - returnRegistered);
    const returnLevel = getCapacityLevel(returnRegistered, returnCapacity);

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
      returnCapacity,
      returnRegistered,
      returnRemaining,
      level,
      returnLevel,
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
      stopCount: stopsByRoute.get(routeId) || 0,
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
    if (summary.direction === "round_trip") {
      totalSeats += summary.capacity + summary.returnCapacity;
      totalRegisteredSeats += summary.registered + summary.returnRegistered;
    } else {
      totalSeats += summary.capacity;
      totalRegisteredSeats += summary.registered;
    }
  }

  for (const reg of registrations) {
    const count = Number(reg.passengerCount || 0);
    if (reg.needsOutbound) outboundPassengers += count;
    if (reg.needsReturn) returnPassengers += count;
  }

  const fullRoutes = routeSummaries.filter((r) => {
    if (!r.active) return false;
    if (r.direction === "round_trip") {
      return r.level === "full" || r.returnLevel === "full";
    }
    return r.level === "full";
  }).length;
  const almostFullRoutes = routeSummaries.filter((r) => {
    if (!r.active) return false;
    const levels = [r.level, r.direction === "round_trip" ? r.returnLevel : null];
    return levels.some((l) => l === "almost_full" || l === "filling");
  }).length;

  const issues: string[] = [];
  for (const r of routeSummaries) {
    if (!r.active) continue;
    if (r.level === "full") {
      issues.push(
        r.direction === "round_trip" ? `הלוך מלא: ${r.name}` : `קו מלא: ${r.name}`
      );
      if (r.waitlistedPassengers > 0) {
        issues.push(
          `נפתחו מקומות? ${r.name} מלא — ${r.waitlistedPassengers} בהמתנה`
        );
      }
    }
    if (r.direction === "round_trip" && r.returnLevel === "full") {
      issues.push(`חזור מלא: ${r.name}`);
    }
    if (r.level === "almost_full") issues.push(`קו כמעט מלא: ${r.name}`);
    if (r.direction === "round_trip" && r.returnLevel === "almost_full") {
      issues.push(`חזור כמעט מלא: ${r.name}`);
    }
  }

  const waitlistOpportunities = routeSummaries
    .filter((r) => {
      if (!r.active || r.waitlistedPassengers <= 0) return false;
      if (r.direction === "round_trip") {
        return r.remaining > 0 || r.returnRemaining > 0;
      }
      return r.remaining > 0;
    })
    .map((r) => {
      const remaining =
        r.direction === "round_trip"
          ? r.remaining + r.returnRemaining
          : r.remaining;
      return {
        routeId: r.routeId,
        name: r.name,
        remaining,
        waitlistedCount: r.waitlistedCount,
        waitlistedPassengers: r.waitlistedPassengers,
        message: `נפתחו ${remaining} מקומות — יש ${r.waitlistedCount} ברשימת המתנה`,
      };
    });

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
