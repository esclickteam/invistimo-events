/**
 * Discrete-time model of the production IVR dialer.
 * No network, no database, and no change to dial settings.
 * CPS 10, a 20 second tick budget (200 starts), cron every 60 seconds, cap 500.
 * A finished call starts one replacement, and that start still counts toward CPS.
 */
import assert from "node:assert/strict";
import test from "node:test";

const CPS = 10;
const TICK_BUDGET = 200;
const CAP = 500;
const CRON_MS = 60_000;
const GAP_MS = 1_100;
const HORIZON_MS = 6 * 60 * 60 * 1000;

type Timeline = {
  queueSize: number;
  durationSec: number;
  tickBudget: number;
  secondsTo500: number | null;
  secondsToStartAll: number | null;
  maxActive: number;
  cronStarts: number;
  hangupStarts: number;
  cronBudgetAbandoned: number;
  idleUnderCapSec: number;
  minutes: Array<{ minute: number; active: number; queued: number }>;
};

function simulate(input: {
  queueSize: number;
  durationSec: number;
  tickBudget?: number;
}): Timeline {
  const durationMs = input.durationSec * 1000;
  const tickBudget = input.tickBudget ?? TICK_BUDGET;
  let queue = input.queueSize;
  let active = 0;
  const ends: number[] = [];
  const starts: number[] = [];
  const deferred: number[] = [];
  let maxActive = 0;
  let timeTo500: number | null = null;
  let timeToAll: number | null = null;
  let cronStarts = 0;
  let hangupStarts = 0;
  let cronBudgetAbandoned = 0;
  let idleUnderCapMs = 0;
  const minutes: Timeline["minutes"] = [];
  let nextMinute = 1;

  function mark(t: number) {
    if (active > maxActive) maxActive = active;
    if (timeTo500 === null && active >= CAP) timeTo500 = t;
    if (queue === 0 && timeToAll === null) timeToAll = t;
  }

  function cpsUsed(t: number) {
    const since = t - 1000;
    let count = 0;
    for (let index = starts.length - 1; index >= 0; index -= 1) {
      if (starts[index] <= since) break;
      count += 1;
    }
    return count;
  }

  function insertEnd(at: number) {
    let low = 0;
    let high = ends.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (ends[mid] <= at) low = mid + 1;
      else high = mid;
    }
    ends.splice(low, 0, at);
  }

  function start(t: number, source: "cron" | "hangup") {
    if (queue < 1 || active >= CAP || cpsUsed(t) >= CPS) return false;
    queue -= 1;
    active += 1;
    starts.push(t);
    insertEnd(t + durationMs);
    if (source === "cron") cronStarts += 1;
    else hangupStarts += 1;
    mark(t);
    return true;
  }

  function expire(t: number) {
    while (ends.length && ends[0] <= t) {
      const endAt = ends.shift() as number;
      active -= 1;
      if (queue > 0 && active < CAP) {
        if (!start(endAt, "hangup")) deferred.push(endAt + GAP_MS);
      }
    }
    deferred.sort((a, b) => a - b);
    while (deferred.length && deferred[0] <= t) {
      const when = deferred.shift() as number;
      if (queue > 0 && active < CAP) start(when, "hangup");
    }
  }

  function snapshot(t: number) {
    while (t >= nextMinute * CRON_MS && nextMinute <= 180) {
      minutes.push({
        minute: nextMinute,
        active,
        queued: queue,
      });
      nextMinute += 1;
    }
  }

  function runCron(startAt: number) {
    let t = startAt;
    let budget = Math.min(tickBudget, Math.max(0, CAP - active));
    while (budget > 0 && queue > 0 && active < CAP && t - startAt < CRON_MS) {
      expire(t);
      snapshot(t);
      if (queue < 1 || active >= CAP) break;
      if (start(t, "cron")) {
        budget -= 1;
        continue;
      }
      const wake = t + GAP_MS;
      expire(wake);
      snapshot(wake);
      t = wake;
      if (queue < 1 || active >= CAP) break;
      if (start(t, "cron")) {
        budget -= 1;
        continue;
      }
      cronBudgetAbandoned += budget;
      break;
    }
    expire(t);
    snapshot(t);
    return t;
  }

  let now = 0;
  let nextCron = 0;
  while (now <= HORIZON_MS && (queue > 0 || active > 0)) {
    if (now >= nextCron) {
      const finished = runCron(now);
      nextCron += CRON_MS;
      now = Math.max(now, finished);
      continue;
    }
    const next = Math.min(nextCron, ends[0] ?? Infinity, deferred[0] ?? Infinity);
    if (!Number.isFinite(next)) break;
    if (next > now && queue > 0 && active < CAP) idleUnderCapMs += next - now;
    snapshot(next);
    now = next;
    expire(now);
    snapshot(now);
    if (queue < 1 && active < 1) break;
  }

  return {
    queueSize: input.queueSize,
    durationSec: input.durationSec,
    tickBudget,
    secondsTo500: timeTo500 === null ? null : Math.round(timeTo500 / 100) / 10,
    secondsToStartAll: timeToAll === null ? null : Math.round(timeToAll / 100) / 10,
    maxActive,
    cronStarts,
    hangupStarts,
    cronBudgetAbandoned,
    idleUnderCapSec: Math.round(idleUnderCapMs / 100) / 10,
    minutes: minutes.filter((row) => row.minute <= 8 || row.queued > 0).slice(0, 12),
  };
}

test("production pace reaches 500 only as fast as 10 calls per second and the minute cron allow", () => {
  const rows = [500, 1000, 2000].flatMap((queueSize) =>
    [30, 60, 120].map((durationSec) => simulate({ queueSize, durationSec }))
  );
  const widerTick = simulate({ queueSize: 2000, durationSec: 120, tickBudget: 400 });
  const widerShort = [30, 60].map((durationSec) =>
    simulate({ queueSize: 2000, durationSec, tickBudget: 400 })
  );
  const fullMinute = simulate({ queueSize: 2000, durationSec: 120, tickBudget: 600 });

  for (const row of rows) {
    assert.ok(row.maxActive <= CAP, `${row.queueSize}/${row.durationSec} peaked at ${row.maxActive}`);
    assert.equal(row.cronStarts + row.hangupStarts, row.queueSize);
    assert.ok(row.secondsToStartAll !== null, `${row.queueSize}/${row.durationSec} did not finish`);
  }

  const base = rows.find((row) => row.queueSize === 2000 && row.durationSec === 120);
  assert.ok(base);
  assert.equal(base.maxActive, 400);
  assert.equal(base.secondsTo500, null);
  assert.ok(base.idleUnderCapSec > 30);
  assert.equal(widerTick.secondsTo500 !== null, true);
  assert.ok((widerTick.secondsTo500 || 0) < 120);
  assert.equal(widerTick.maxActive, 500);
  assert.ok(fullMinute.maxActive <= CAP);
  assert.equal(fullMinute.cronStarts + fullMinute.hangupStarts, 2000);

  console.log(
    `IVR_PACE_TIMELINE ${JSON.stringify({
      assumptions: {
        callsPerSecond: CPS,
        tickBudget: TICK_BUDGET,
        cronEverySec: 60,
        cap: CAP,
        hangupStartsOneCall: true,
      },
      rows,
      comparisonFor2000CallsOf120Sec: {
        currentTickBudget200: base,
        tickBudget400: widerTick,
        tickBudget400ForShorterCalls: widerShort,
        tickBudget600: fullMinute,
      },
    })}`
  );
});
