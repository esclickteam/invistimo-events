import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  IVR_ACCOUNT_PARALLEL_LIMIT,
  IVR_ACTIVE_CHANNEL_STATUSES,
  admitOutboundDials,
  ivrDialTickBudget,
  ivrMaxParallelCalls,
  orderQueueFairly,
  planFairDialGrants,
} from "../../lib/calls/ivrCapacity";

test("account ceiling is 500 and cannot be raised", () => {
  const previous = process.env.IVR_MAX_PARALLEL_CALLS;
  delete process.env.IVR_MAX_PARALLEL_CALLS;
  assert.equal(ivrMaxParallelCalls(), IVR_ACCOUNT_PARALLEL_LIMIT);
  process.env.IVR_MAX_PARALLEL_CALLS = "10000";
  assert.equal(ivrMaxParallelCalls(), 500);
  process.env.IVR_MAX_PARALLEL_CALLS = "12";
  assert.equal(ivrMaxParallelCalls(), 12);
  if (previous === undefined) delete process.env.IVR_MAX_PARALLEL_CALLS;
  else process.env.IVR_MAX_PARALLEL_CALLS = previous;
});

test("queued calls do not hold an active channel", () => {
  assert.equal(IVR_ACTIVE_CHANNEL_STATUSES.includes("queued" as "initiated"), false);
  assert.ok(IVR_ACTIVE_CHANNEL_STATUSES.includes("initiated"));
  assert.ok(IVR_ACTIVE_CHANNEL_STATUSES.includes("ringing"));
  assert.ok(IVR_ACTIVE_CHANNEL_STATUSES.includes("answered"));
});

test("admission stops at 500 and paces within the same second", () => {
  assert.deepEqual(
    admitOutboundDials({
      active: 500,
      limit: 500,
      startedLastSecond: 0,
      callsPerSecond: 10,
      requested: 20,
    }),
    { admit: 0, reason: "full" }
  );
  assert.deepEqual(
    admitOutboundDials({
      active: 100,
      limit: 500,
      startedLastSecond: 10,
      callsPerSecond: 10,
      requested: 20,
    }),
    { admit: 0, reason: "paced" }
  );
  assert.deepEqual(
    admitOutboundDials({
      active: 490,
      limit: 500,
      startedLastSecond: 0,
      callsPerSecond: 10,
      requested: 20,
    }),
    { admit: 10, reason: "ok" }
  );
});

test("800 waiting calls keep 500 active and 300 queued", () => {
  let active = 0;
  let placed = 0;
  const waiting = 800;
  let startedLastSecond = 0;
  while (placed < waiting && active < 500) {
    const decision = admitOutboundDials({
      active,
      limit: 500,
      startedLastSecond,
      callsPerSecond: 10,
      requested: 1,
    });
    if (decision.reason === "paced") {
      startedLastSecond = 0;
      continue;
    }
    if (decision.reason === "full" || decision.admit < 1) break;
    active += 1;
    placed += 1;
    startedLastSecond += 1;
  }
  assert.equal(active, 500);
  assert.equal(waiting - placed, 300);
});

test("two workers sharing one counter cannot pass 500", () => {
  let active = 0;
  let startedLastSecond = 0;
  const take = () => {
    const decision = admitOutboundDials({
      active,
      limit: 500,
      startedLastSecond,
      callsPerSecond: 10,
      requested: 1,
    });
    if (decision.reason === "paced") {
      startedLastSecond = 0;
      return "paced" as const;
    }
    if (decision.admit < 1) return "full" as const;
    active += 1;
    startedLastSecond += 1;
    return "ok" as const;
  };

  let first = 0;
  let second = 0;
  while (first < 400 || second < 400) {
    if (first < 400) {
      const result = take();
      if (result === "full") break;
      if (result === "ok") first += 1;
    }
    if (second < 400) {
      const result = take();
      if (result === "full") break;
      if (result === "ok") second += 1;
    }
  }
  assert.equal(active, 500);
  assert.equal(first + second, 500);
  assert.ok(first > 0 && second > 0);
});

test("one tick budget is the free channels limited by CPS", () => {
  const previousCps = process.env.IVR_OUTBOUND_CPS;
  const previousTick = process.env.IVR_DIAL_TICK_SECONDS;
  const previousCap = process.env.IVR_MAX_PARALLEL_CALLS;
  process.env.IVR_OUTBOUND_CPS = "10";
  process.env.IVR_DIAL_TICK_SECONDS = "20";
  process.env.IVR_MAX_PARALLEL_CALLS = "500";
  assert.equal(ivrDialTickBudget(0), 200);
  assert.equal(ivrDialTickBudget(450), 50);
  assert.equal(ivrDialTickBudget(500), 0);
  if (previousCps === undefined) delete process.env.IVR_OUTBOUND_CPS;
  else process.env.IVR_OUTBOUND_CPS = previousCps;
  if (previousTick === undefined) delete process.env.IVR_DIAL_TICK_SECONDS;
  else process.env.IVR_DIAL_TICK_SECONDS = previousTick;
  if (previousCap === undefined) delete process.env.IVR_MAX_PARALLEL_CALLS;
  else process.env.IVR_MAX_PARALLEL_CALLS = previousCap;
});

test("fair grants split one pool across events", () => {
  const grants = planFairDialGrants({
    budget: 500,
    sources: [
      { id: "event-a", waiting: 800, active: 0 },
      { id: "event-b", waiting: 800, active: 0 },
    ],
  });
  assert.equal(grants["event-a"], 250);
  assert.equal(grants["event-b"], 250);

  const busy = planFairDialGrants({
    budget: 100,
    sources: [
      { id: "busy", waiting: 800, active: 400 },
      { id: "idle", waiting: 800, active: 0 },
    ],
  });
  assert.equal(busy.idle, 100);
  assert.equal(busy.busy, undefined);
});

test("queued calls are ordered toward the customer with fewer active calls", () => {
  const ordered = orderQueueFairly(
    [
      { id: "a1", userId: "busy" },
      { id: "a2", userId: "busy" },
      { id: "b1", userId: "idle" },
      { id: "c1", userId: "quiet" },
    ],
    (item) => item.userId,
    new Map([
      ["busy", 20],
      ["idle", 0],
      ["quiet", 1],
    ])
  );
  assert.deepEqual(
    ordered.map((item) => item.id),
    ["b1", "c1", "a1", "a2"]
  );
});

test("regular IVR and kosher dials share one reservation gate", () => {
  const dialer = readFileSync("lib/calls/ivrDialer.ts", "utf8");
  const kosher = readFileSync("lib/kosherPhones/dispatch.ts", "utf8");
  const cron = readFileSync("app/api/cron/ivr-dial/route.ts", "utf8");
  assert.match(dialer, /reserveOutboundChannel/);
  assert.match(kosher, /reserveOutboundChannel/);
  assert.equal(dialer.includes("IVR_PARALLEL_CALL_HARD_CAP"), false);
  assert.match(cron, /planFairDialGrants/);
  assert.match(cron, /ivrDialTickBudget/);
});
