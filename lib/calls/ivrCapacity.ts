import { randomUUID } from "crypto";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import IvrCapacityLock from "@/models/IvrCapacityLock";

/** Telnyx account ceiling. One shared pool for every outbound IVR call. */
export const IVR_ACCOUNT_PARALLEL_LIMIT = 500;

const DEFAULT_CPS = 10;
const MAX_CPS = 50;
const DEFAULT_TICK_SECONDS = 20;
const MAX_TICK_SECONDS = 40;
const LOCK_MS = 8000;

/** Statuses that hold a live Telnyx channel. Waiting `queued` rows do not. */
export const IVR_ACTIVE_CHANNEL_STATUSES = [
  "initiated",
  "ringing",
  "answered",
  "invalid_input",
] as const;

function clampInt(raw: number, fallback: number, min: number, max: number) {
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

/**
 * Account-wide active outbound IVR calls.
 * IVR_MAX_PARALLEL_CALLS may lower the ceiling. It cannot raise it above 500.
 */
export function ivrMaxParallelCalls() {
  const raw = Number(process.env.IVR_MAX_PARALLEL_CALLS ?? IVR_ACCOUNT_PARALLEL_LIMIT);
  return clampInt(raw, IVR_ACCOUNT_PARALLEL_LIMIT, 1, IVR_ACCOUNT_PARALLEL_LIMIT);
}

/**
 * How many new outbound calls may be created in one second.
 * 500 active calls are not 500 call setups in the same second.
 * IVR_OUTBOUND_CPS overrides the default. It cannot exceed 50.
 */
export function ivrOutboundCallsPerSecond() {
  const raw = Number(process.env.IVR_OUTBOUND_CPS ?? DEFAULT_CPS);
  return clampInt(raw, DEFAULT_CPS, 1, MAX_CPS);
}

/** How long one cron tick may spend opening calls. IVR_DIAL_TICK_SECONDS overrides it. */
export function ivrDialTickSeconds() {
  const raw = Number(process.env.IVR_DIAL_TICK_SECONDS ?? DEFAULT_TICK_SECONDS);
  return clampInt(raw, DEFAULT_TICK_SECONDS, 1, MAX_TICK_SECONDS);
}

export function ivrPaceWaitMs() {
  return 1100;
}

/** First burst inside the message worker, before the shared cron keeps filling. */
export function ivrInlineDialBurst() {
  return Math.max(1, ivrOutboundCallsPerSecond() * 3);
}

export function ivrDialTickBudget(active: number) {
  const room = Math.max(0, ivrMaxParallelCalls() - Math.max(0, active));
  const pace = ivrOutboundCallsPerSecond() * ivrDialTickSeconds();
  return Math.min(room, pace);
}

export function activeOutboundFilter() {
  return {
    channel: "outbound_ivr" as const,
    $or: [
      { status: { $in: [...IVR_ACTIVE_CHANNEL_STATUSES] } },
      {
        status: "completed",
        endedAt: null,
        flowStep: { $ne: "done" },
      },
    ],
  };
}

export function admitOutboundDials(input: {
  active: number;
  limit: number;
  startedLastSecond: number;
  callsPerSecond: number;
  requested: number;
}): { admit: number; reason: "ok" | "full" | "paced" } {
  const requested = Math.max(0, Math.floor(input.requested));
  const room = Math.max(0, Math.floor(input.limit) - Math.max(0, Math.floor(input.active)));
  if (requested < 1 || room < 1) return { admit: 0, reason: "full" };
  const paceRoom = Math.max(
    0,
    Math.floor(input.callsPerSecond) - Math.max(0, Math.floor(input.startedLastSecond))
  );
  if (paceRoom < 1) return { admit: 0, reason: "paced" };
  return { admit: Math.min(requested, room, paceRoom), reason: "ok" };
}

export type DialShareSource = {
  id: string;
  waiting: number;
  active: number;
};

/** Give the next call to whichever event currently holds the fewest active calls. */
export function planFairDialGrants(input: {
  budget: number;
  sources: DialShareSource[];
}): Record<string, number> {
  const grants: Record<string, number> = {};
  const left = new Map<string, number>();
  const load = new Map<string, number>();
  for (const source of input.sources) {
    left.set(source.id, Math.max(0, Math.floor(source.waiting)));
    load.set(source.id, Math.max(0, Math.floor(source.active)));
  }
  let budget = Math.max(0, Math.floor(input.budget));
  const ids = input.sources.map((source) => source.id);

  while (budget > 0) {
    const eligible = ids.filter((id) => (left.get(id) || 0) > 0);
    if (!eligible.length) break;
    eligible.sort(
      (a, b) => (load.get(a) || 0) - (load.get(b) || 0) || a.localeCompare(b)
    );
    const pick = eligible[0];
    grants[pick] = (grants[pick] || 0) + 1;
    left.set(pick, (left.get(pick) || 0) - 1);
    load.set(pick, (load.get(pick) || 0) + 1);
    budget -= 1;
  }

  return grants;
}

export function orderQueueFairly<T>(
  items: T[],
  keyOf: (item: T) => string,
  activeByKey: Map<string, number>
): T[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item) || "unknown";
    const list = buckets.get(key) || [];
    list.push(item);
    buckets.set(key, list);
  }
  const load = new Map<string, number>();
  for (const key of buckets.keys()) {
    load.set(key, activeByKey.get(key) || 0);
  }

  const ordered: T[] = [];
  while (ordered.length < items.length) {
    let pick: string | null = null;
    for (const [key, list] of buckets) {
      if (!list.length) continue;
      if (pick === null || (load.get(key) || 0) < (load.get(pick) || 0)) pick = key;
    }
    if (!pick) break;
    const next = buckets.get(pick)?.shift();
    if (!next) break;
    ordered.push(next);
    load.set(pick, (load.get(pick) || 0) + 1);
  }
  return ordered;
}

export async function countActiveOutboundCalls() {
  return IvrCallAttempt.countDocuments(activeOutboundFilter());
}

export async function countActiveOutboundByUser() {
  const rows = await IvrCallAttempt.aggregate([
    { $match: activeOutboundFilter() },
    { $group: { _id: "$userId", n: { $sum: 1 } } },
  ]);
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(String(row._id || ""), Number(row.n) || 0);
  }
  return counts;
}

async function countDialsStartedLastSecond() {
  const since = new Date(Date.now() - 1000);
  return IvrCallAttempt.countDocuments({
    channel: "outbound_ivr",
    dialLockedAt: { $gte: since },
    status: { $in: [...IVR_ACTIVE_CHANNEL_STATUSES] },
  });
}

/**
 * Hold the global gate, then mark one attempt active only if the account
 * still has room and this second still has CPS. The Telnyx request itself
 * stays outside the lock.
 */
export async function reserveOutboundChannel(
  markActive: () => Promise<boolean>
): Promise<"reserved" | "full" | "paced" | "lost"> {
  const token = randomUUID();
  const now = new Date();
  try {
    await IvrCapacityLock.updateOne(
      { key: "global" },
      { $setOnInsert: { key: "global", lockUntil: new Date(0), lockToken: "" } },
      { upsert: true }
    );
  } catch {
    // Another worker created the lock document first.
  }

  const lock = await IvrCapacityLock.findOneAndUpdate(
    {
      key: "global",
      $or: [
        { lockUntil: { $lte: now } },
        { lockUntil: null },
        { lockUntil: { $exists: false } },
      ],
    },
    {
      $set: {
        lockUntil: new Date(now.getTime() + LOCK_MS),
        lockToken: token,
      },
    },
    { new: true }
  );
  if (!lock || lock.lockToken !== token) return "paced";

  try {
    const active = await countActiveOutboundCalls();
    const startedLastSecond = await countDialsStartedLastSecond();
    const decision = admitOutboundDials({
      active,
      limit: ivrMaxParallelCalls(),
      startedLastSecond,
      callsPerSecond: ivrOutboundCallsPerSecond(),
      requested: 1,
    });
    if (decision.admit < 1) return decision.reason === "full" ? "full" : "paced";
    const marked = await markActive();
    return marked ? "reserved" : "lost";
  } finally {
    await IvrCapacityLock.updateOne(
      { key: "global", lockToken: token },
      { $set: { lockUntil: new Date(0), lockToken: "" } }
    );
  }
}
