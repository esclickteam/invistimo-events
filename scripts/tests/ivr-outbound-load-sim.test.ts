/**
 * Isolated load simulation for the shared outbound IVR capacity.
 *
 * Uses mongodb-memory-server and the real admission lock. Telnyx, WhatsApp,
 * and SMS are never contacted. No production customer or guest documents are
 * read or written. Narration, DTMF, RSVP, and schedules are not invoked.
 */
import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import IvrCallAttempt from "../../models/IvrCallAttempt";
import IvrCapacityLock from "../../models/IvrCapacityLock";
import { KOSHER_MESSAGE_ROUND_ORIGIN } from "../../lib/kosherPhones/match";
import {
  activeOutboundFilter,
  countActiveOutboundByUser,
  countActiveOutboundCalls,
  ivrDialTickBudget,
  ivrMaxParallelCalls,
  ivrOutboundCallsPerSecond,
  ivrPaceWaitMs,
  orderQueueFairly,
  planFairDialGrants,
  reserveOutboundChannel,
} from "../../lib/calls/ivrCapacity";
import {
  shouldReleaseStaleOutbound,
  staleOutboundReleaseAction,
} from "../../lib/calls/ivrDialFailure";

const BLOCKED_NETWORK = /telnyx\.com|whatsapp|graph\.facebook|twilio|nexmo|messagebird/i;

type Kind = "regular" | "kosher";

type Scenario = {
  id: string;
  title: string;
  passed: boolean;
  simulatedCalls: number;
  maxConcurrent: number;
  active: number;
  queued: number;
  completed: number;
  failed: number;
  dialed: number;
  queueWaitMs: { first: number | null; avg: number | null; max: number | null };
  cpsObserved: number;
  perCustomer: Array<{ customer: string; kind: Kind; active: number; queued: number }>;
  notes: string[];
};

type Customer = {
  key: string;
  label: string;
  kind: Kind;
  userId: mongoose.Types.ObjectId;
  invitationId: mongoose.Types.ObjectId;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyWait(): Scenario["queueWaitMs"] {
  return { first: null, avg: null, max: null };
}

function scenario(id: string, title: string): Scenario {
  return {
    id,
    title,
    passed: true,
    simulatedCalls: 0,
    maxConcurrent: 0,
    active: 0,
    queued: 0,
    completed: 0,
    failed: 0,
    dialed: 0,
    queueWaitMs: emptyWait(),
    cpsObserved: 0,
    perCustomer: [],
    notes: [],
  };
}

function expect(row: Scenario, condition: unknown, note: string) {
  if (condition) return;
  row.passed = false;
  row.notes.push(note);
}

function waitStats(samples: number[]): Scenario["queueWaitMs"] {
  if (!samples.length) return emptyWait();
  const sum = samples.reduce((total, value) => total + value, 0);
  return {
    first: samples[0],
    avg: Math.round(sum / samples.length),
    max: Math.max(...samples),
  };
}

test("simulated IVR load stays inside one shared 500-call pool", async (t) => {
  const originalFetch = globalThis.fetch;
  let blockedNetworkCalls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const href = String(input instanceof Request ? input.url : input);
    if (BLOCKED_NETWORK.test(href)) {
      blockedNetworkCalls += 1;
      throw new Error("SIMULATION_BLOCKED_NETWORK");
    }
    return originalFetch(input, init);
  }) as typeof fetch;

  const savedEnv = {
    TELNYX_API_KEY: process.env.TELNYX_API_KEY,
    TELNYX_CONNECTION_ID: process.env.TELNYX_CONNECTION_ID,
    IVR_ALLOW_LIVE_DIAL: process.env.IVR_ALLOW_LIVE_DIAL,
    IVR_MAX_PARALLEL_CALLS: process.env.IVR_MAX_PARALLEL_CALLS,
    IVR_OUTBOUND_CPS: process.env.IVR_OUTBOUND_CPS,
    IVR_DIAL_TICK_SECONDS: process.env.IVR_DIAL_TICK_SECONDS,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  delete process.env.TELNYX_API_KEY;
  delete process.env.TELNYX_CONNECTION_ID;
  process.env.IVR_ALLOW_LIVE_DIAL = "false";
  delete process.env.VERCEL_ENV;

  let mongod: MongoMemoryServer | null = null;
  let localDials = 0;
  const scenarios: Scenario[] = [];
  const startedAt = Date.now();

  const customers: Customer[] = [0, 1, 2, 3].map((index) => ({
    key: `customer-${index + 1}`,
    label: `לקוח ${index + 1} / אירוע ${index + 1}`,
    kind: index < 2 ? "regular" : "kosher",
    userId: new mongoose.Types.ObjectId(),
    invitationId: new mongoose.Types.ObjectId(),
  }));
  let phoneSeq = 0;

  function customerByUser(userId: string) {
    return customers.find((item) => String(item.userId) === userId);
  }

  async function resetCalls() {
    await IvrCallAttempt.deleteMany({});
    await IvrCapacityLock.deleteMany({});
  }

  async function seedQueued(perCustomer: number) {
    const docs = [];
    for (const customer of customers) {
      for (let index = 0; index < perCustomer; index += 1) {
        phoneSeq += 1;
        const national = String(50000000 + phoneSeq).padStart(8, "0");
        docs.push({
          userId: customer.userId,
          invitationId: customer.invitationId,
          guestId: new mongoose.Types.ObjectId(),
          round: 1 as const,
          runId: "sim-run-1",
          phone: `+9725${national}`,
          channel: "outbound_ivr" as const,
          direction: "outbound" as const,
          origin: customer.kind === "kosher" ? KOSHER_MESSAGE_ROUND_ORIGIN : "",
          scheduleId: customer.kind === "kosher" ? new mongoose.Types.ObjectId() : null,
          status: "queued" as const,
          flowStep: "dialing" as const,
          phase: "RINGING" as const,
          answered: false,
          rsvpApplied: false,
          durationSeconds: 0,
          dtmfDigits: [],
          processedWebhookEventIds: [],
          retryCount: 0,
          dialLockedAt: new Date(),
          error: "",
        });
      }
    }
    for (let offset = 0; offset < docs.length; offset += 500) {
      await IvrCallAttempt.insertMany(docs.slice(offset, offset + 500), { ordered: true });
    }
    return docs.length;
  }

  async function claim(attemptId: mongoose.Types.ObjectId) {
    return reserveOutboundChannel(async () => {
      const claimed = await IvrCallAttempt.findOneAndUpdate(
        {
          _id: attemptId,
          status: "queued",
          $or: [
            { telnyxCallControlId: { $exists: false } },
            { telnyxCallControlId: null },
            { telnyxCallControlId: "" },
          ],
        },
        {
          $set: {
            status: "initiated",
            flowStep: "dialing",
            dialLockedAt: new Date(),
            error: "",
          },
        },
        { new: true }
      );
      return Boolean(claimed);
    });
  }

  async function mockDial(attemptId: mongoose.Types.ObjectId) {
    localDials += 1;
    const updated = await IvrCallAttempt.updateOne(
      {
        _id: attemptId,
        status: "initiated",
        $or: [
          { telnyxCallControlId: { $exists: false } },
          { telnyxCallControlId: null },
          { telnyxCallControlId: "" },
        ],
      },
      {
        $set: {
          status: "ringing",
          telnyxCallControlId: `sim-${String(attemptId)}`,
          telnyxCallLegId: `leg-${String(attemptId)}`,
          dialRequestedAt: new Date(),
        },
      }
    );
    if (updated.modifiedCount !== 1) {
      throw new Error(`simulated dial attached ${updated.modifiedCount} ids`);
    }
  }

  async function snapshot() {
    const [active, queued, completed, failed, activeByUser, queuedGroups, originGroups] =
      await Promise.all([
        countActiveOutboundCalls(),
        IvrCallAttempt.countDocuments({ channel: "outbound_ivr", status: "queued" }),
        IvrCallAttempt.countDocuments({ channel: "outbound_ivr", status: "completed" }),
        IvrCallAttempt.countDocuments({ channel: "outbound_ivr", status: "failed" }),
        countActiveOutboundByUser(),
        IvrCallAttempt.aggregate([
          { $match: { channel: "outbound_ivr", status: "queued" } },
          { $group: { _id: "$userId", n: { $sum: 1 } } },
        ]),
        IvrCallAttempt.aggregate([
          { $match: activeOutboundFilter() },
          {
            $group: {
              _id: {
                $cond: [
                  { $eq: ["$origin", KOSHER_MESSAGE_ROUND_ORIGIN] },
                  "kosher",
                  "regular",
                ],
              },
              n: { $sum: 1 },
            },
          },
        ]),
      ]);
    const queuedByUser = new Map<string, number>();
    for (const group of queuedGroups) queuedByUser.set(String(group._id), Number(group.n) || 0);
    const origins = { regular: 0, kosher: 0 };
    for (const group of originGroups) {
      if (group._id === "kosher") origins.kosher = Number(group.n) || 0;
      else origins.regular = Number(group.n) || 0;
    }
    const perCustomer = customers.map((customer) => ({
      customer: customer.label,
      kind: customer.kind,
      active: activeByUser.get(String(customer.userId)) || 0,
      queued: queuedByUser.get(String(customer.userId)) || 0,
    }));
    return { active, queued, completed, failed, origins, perCustomer, total: active + queued };
  }

  async function maxStartsInAnySecond() {
    const rows = await IvrCallAttempt.find({
      channel: "outbound_ivr",
      dialLockedAt: { $type: "date" },
      status: { $in: ["initiated", "ringing", "answered", "invalid_input"] },
    })
      .select("dialLockedAt")
      .lean();
    const buckets = new Map<number, number>();
    for (const row of rows) {
      const at = row.dialLockedAt ? new Date(row.dialLockedAt).getTime() : 0;
      if (!at) continue;
      const second = Math.floor(at / 1000);
      buckets.set(second, (buckets.get(second) || 0) + 1);
    }
    return Math.max(0, ...buckets.values(), 0);
  }

  async function nextBatch(budget: number) {
    const queued = await IvrCallAttempt.find({ channel: "outbound_ivr", status: "queued" })
      .sort({ createdAt: 1 })
      .select("_id userId origin")
      .lean();
    const activeByUser = await countActiveOutboundByUser();
    const waiting = new Map<string, number>();
    for (const row of queued) {
      const key = String(row.userId || "");
      waiting.set(key, (waiting.get(key) || 0) + 1);
    }
    const sources = [...waiting.entries()].map(([id, count]) => ({
      id,
      waiting: count,
      active: activeByUser.get(id) || 0,
    }));
    const grants = planFairDialGrants({
      budget: Math.max(0, Math.min(budget, queued.length)),
      sources,
    });
    const buckets = new Map<string, typeof queued>();
    for (const row of queued) {
      const key = String(row.userId || "");
      const list = buckets.get(key) || [];
      list.push(row);
      buckets.set(key, list);
    }
    const chosen = [];
    for (const [id, count] of Object.entries(grants)) {
      chosen.push(...(buckets.get(id) || []).slice(0, count));
    }
    return orderQueueFairly(chosen, (row) => String(row.userId || ""), activeByUser);
  }

  async function dialBatch(ids: mongoose.Types.ObjectId[], maxConcurrent: { value: number }) {
    let dialed = 0;
    let stopped: "full" | "paced" | "done" = "done";
    let overshoot = 0;
    const waits: number[] = [];
    const limit = ivrMaxParallelCalls();
    for (const id of ids) {
      const attemptStarted = Date.now();
      let slot = await claim(id);
      if (slot === "paced") {
        await sleep(ivrPaceWaitMs());
        slot = await claim(id);
      }
      if (slot === "full" || slot === "paced") {
        stopped = slot;
        break;
      }
      if (slot === "lost") continue;
      const activeNow = await countActiveOutboundCalls();
      if (activeNow > maxConcurrent.value) maxConcurrent.value = activeNow;
      if (activeNow > limit) {
        waits.push(Date.now() - attemptStarted);
        return { dialed, stopped: "full" as const, waits, overshoot: activeNow };
      }
      await mockDial(id);
      dialed += 1;
      waits.push(Date.now() - attemptStarted);
    }
    return { dialed, stopped, waits, overshoot };
  }

  async function fillToCapacity(maxConcurrent: { value: number }) {
    let dialed = 0;
    let ticks = 0;
    const waits: number[] = [];
    while (ticks < 30) {
      const active = await countActiveOutboundCalls();
      if (active > maxConcurrent.value) maxConcurrent.value = active;
      if (active >= ivrMaxParallelCalls()) break;
      const budget = ivrDialTickBudget(active);
      if (budget < 1) break;
      const batch = await nextBatch(budget);
      if (!batch.length) break;
      const result = await dialBatch(
        batch.map((row) => row._id as mongoose.Types.ObjectId),
        maxConcurrent
      );
      dialed += result.dialed;
      waits.push(...result.waits);
      ticks += 1;
      if (result.dialed < 1) {
        if (result.stopped === "paced") continue;
        break;
      }
    }
    return { dialed, ticks, waits };
  }

  function paint(row: Scenario, state: Awaited<ReturnType<typeof snapshot>>, extra?: Partial<Scenario>) {
    row.simulatedCalls = state.total + state.completed + state.failed;
    row.active = state.active;
    row.queued = state.queued;
    row.completed = state.completed;
    row.failed = state.failed;
    row.perCustomer = state.perCustomer;
    if (extra?.maxConcurrent != null) row.maxConcurrent = extra.maxConcurrent;
    if (extra?.dialed != null) row.dialed = extra.dialed;
    if (extra?.cpsObserved != null) row.cpsObserved = extra.cpsObserved;
    if (extra?.queueWaitMs) row.queueWaitMs = extra.queueWaitMs;
    if (extra?.notes?.length) row.notes.push(...extra.notes);
  }

  try {
    mongod = await MongoMemoryServer.create();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    t.skip(`mongodb-memory-server unavailable: ${message}`);
    globalThis.fetch = originalFetch;
    return;
  }

  const uri = mongod.getUri();
  if (!/127\.0\.0\.1|localhost/.test(uri)) {
    throw new Error("refusing to run the load simulation outside the local memory database");
  }

  try {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    await mongoose.connect(uri);
    await IvrCallAttempt.init();
    await IvrCapacityLock.init();

    process.env.IVR_OUTBOUND_CPS = "10";
    process.env.IVR_DIAL_TICK_SECONDS = "20";
    process.env.IVR_MAX_PARALLEL_CALLS = "4";
    await resetCalls();

    const ghost = scenario(
      "ghost-slot",
      "שיחה שהסתיימה בלי חותמת סיום עדיין תופסת מקום בקיבולת"
    );
    scenarios.push(ghost);
    await IvrCallAttempt.create({
      userId: customers[0].userId,
      invitationId: customers[0].invitationId,
      guestId: new mongoose.Types.ObjectId(),
      round: 1,
      runId: "sim-ghost",
      phone: "+972500000001",
      channel: "outbound_ivr",
      direction: "outbound",
      origin: "",
      status: "completed",
      flowStep: "playing_intro",
      answered: true,
      rsvpApplied: false,
      durationSeconds: 0,
      endedAt: null,
      dtmfDigits: [],
      processedWebhookEventIds: [],
    });
    await seedQueued(3);
    const ghostFill = await fillToCapacity({ value: 0 });
    const ghostState = await snapshot();
    paint(ghost, ghostState, {
      maxConcurrent: ghostState.active,
      dialed: ghostFill.dialed,
      cpsObserved: await maxStartsInAnySecond(),
    });
    expect(ghost, ghostState.active === 4, `active was ${ghostState.active}, expected 4 including the unfinished call`);
    expect(ghost, ghostState.queued === 9, `queued was ${ghostState.queued}, expected 9`);
    expect(ghost, ghostFill.dialed === 3, `dialed ${ghostFill.dialed} into a pool that already held 1`);

    const cps = scenario("cps", "קצב פתיחת השיחות לא עובר את המכסה לשנייה");
    scenarios.push(cps);
    await resetCalls();
    process.env.IVR_MAX_PARALLEL_CALLS = "500";
    process.env.IVR_OUTBOUND_CPS = "10";
    const cpsSeeded = await seedQueued(10);
    const cpsIds = (
      await IvrCallAttempt.find({ status: "queued" }).select("_id").lean()
    ).map((row) => row._id as mongoose.Types.ObjectId);
    let cpsReserved = 0;
    let cpsPaced = 0;
    for (const id of cpsIds) {
      const slot = await claim(id);
      if (slot === "reserved") {
        cpsReserved += 1;
        await mockDial(id);
      } else if (slot === "paced") cpsPaced += 1;
      else cps.notes.push(`unexpected slot ${slot}`);
    }
    const cpsState = await snapshot();
    const duringBurst = await maxStartsInAnySecond();
    await sleep(ivrPaceWaitMs());
    const resumed = await IvrCallAttempt.findOne({ status: "queued" }).select("_id");
    let resumedSlot = "missing";
    if (resumed?._id) {
      resumedSlot = await claim(resumed._id as mongoose.Types.ObjectId);
      if (resumedSlot === "reserved") await mockDial(resumed._id as mongoose.Types.ObjectId);
    }
    const cpsAfter = await snapshot();
    paint(cps, cpsAfter, {
      maxConcurrent: cpsState.active,
      dialed: cpsReserved + (resumedSlot === "reserved" ? 1 : 0),
      cpsObserved: duringBurst,
      simulatedCalls: cpsSeeded,
    });
    cps.simulatedCalls = cpsSeeded;
    cps.active = cpsAfter.active;
    cps.queued = cpsAfter.queued;
    expect(cps, cpsReserved === 10, `first second reserved ${cpsReserved}, expected 10`);
    expect(cps, cpsPaced === cpsSeeded - 10, `paced ${cpsPaced}, expected ${cpsSeeded - 10}`);
    expect(cps, cpsState.active === 10, `active during the burst was ${cpsState.active}`);
    expect(cps, duringBurst <= 10, `observed ${duringBurst} starts in one second`);
    expect(cps, resumedSlot === "reserved", `after the pace window the next call returned ${resumedSlot}`);
    expect(cps, cpsAfter.active === 11, `active after the queued resume was ${cpsAfter.active}`);

    const duplicate = scenario("duplicate", "שני Workers לא מחייגים אותו ניסיון פעמיים");
    scenarios.push(duplicate);
    await resetCalls();
    await seedQueued(1);
    const duplicateTarget = await IvrCallAttempt.findOne({ status: "queued" }).select("_id");
    const duplicateId = duplicateTarget?._id as mongoose.Types.ObjectId;
    const firstWave = await Promise.all(Array.from({ length: 12 }, () => claim(duplicateId)));
    let reserved = firstWave.filter((slot) => slot === "reserved").length;
    const pending = firstWave.filter((slot) => slot === "paced").length;
    for (let attempt = 0; attempt < pending; attempt += 1) {
      const slot = await claim(duplicateId);
      if (slot === "reserved") reserved += 1;
      if (slot !== "paced") break;
      await sleep(20);
    }
    if (reserved === 1) await mockDial(duplicateId);
    const secondWave = await Promise.all(Array.from({ length: 8 }, () => claim(duplicateId)));
    const duplicateState = await snapshot();
    const simIds = await IvrCallAttempt.countDocuments({
      telnyxCallControlId: `sim-${String(duplicateId)}`,
    });
    paint(duplicate, duplicateState, {
      maxConcurrent: duplicateState.active,
      dialed: reserved === 1 ? 1 : reserved,
      cpsObserved: await maxStartsInAnySecond(),
    });
    expect(duplicate, reserved === 1, `${reserved} workers reserved the same attempt`);
    expect(duplicate, secondWave.every((slot) => slot === "lost" || slot === "paced"), `second wave ${secondWave.join(",")}`);
    expect(duplicate, simIds === 1, `simulated provider ids on that attempt: ${simIds}`);
    expect(duplicate, duplicateState.active === 1, `active after the duplicate race was ${duplicateState.active}`);

    let duplicateRejected = false;
    try {
      const winner = await IvrCallAttempt.findById(duplicateId).lean();
      if (winner) {
        await IvrCallAttempt.create({
          ...winner,
          _id: new mongoose.Types.ObjectId(),
          guestId: new mongoose.Types.ObjectId(),
          telnyxCallControlId: winner.telnyxCallControlId,
        });
      }
    } catch {
      duplicateRejected = true;
    }
    expect(duplicate, duplicateRejected, "a second document reused the same simulated provider id");

    const restart = scenario("restart", "הפעלה מחדש מחזירה לתור שיחה שלא קיבלה מזהה ספק");
    scenarios.push(restart);
    await resetCalls();
    await seedQueued(2);
    const crashTarget = await IvrCallAttempt.findOne({ status: "queued" }).select("_id");
    const crashId = crashTarget?._id as mongoose.Types.ObjectId;
    const crashSlot = await claim(crashId);
    expect(restart, crashSlot === "reserved", `crash setup returned ${crashSlot}`);
    const past = new Date(Date.now() - 5 * 60 * 1000);
    await IvrCallAttempt.collection.updateOne(
      { _id: crashId },
      {
        $set: {
          updatedAt: past,
          startedAt: past,
          dialLockedAt: past,
          createdAt: past,
        },
      }
    );
    const crashed = await IvrCallAttempt.findById(crashId).lean();
    const action = staleOutboundReleaseAction(crashed || {}, new Date());
    const release = shouldReleaseStaleOutbound({
      action,
      hasCallControlId: false,
      liveness: "unknown",
    });
    const keepLive = shouldReleaseStaleOutbound({
      action: "stuck_dial",
      hasCallControlId: true,
      liveness: "unknown",
    });
    expect(restart, action === "stuck_dial", `stale action was ${action}`);
    expect(restart, release === true, "a dial with no provider id was not requeued");
    expect(restart, keepLive === false, "a live provider id would have been dropped without a provider answer");
    if (release) {
      await IvrCallAttempt.updateMany(
        {
          _id: crashId,
          channel: "outbound_ivr",
          answered: { $ne: true },
          rsvpApplied: { $ne: true },
          $or: [
            { telnyxCallControlId: { $exists: false } },
            { telnyxCallControlId: null },
            { telnyxCallControlId: "" },
          ],
        },
        {
          $set: {
            status: "queued",
            flowStep: "dialing",
            phase: "RINGING",
            endedAt: null,
            error: "",
            dialLockedAt: null,
          },
        }
      );
    }
    const afterRequeue = await countActiveOutboundCalls();
    const again = await claim(crashId);
    if (again === "reserved") await mockDial(crashId);
    const third = await claim(crashId);
    const restartState = await snapshot();
    paint(restart, restartState, {
      maxConcurrent: restartState.active,
      dialed: again === "reserved" ? 1 : 0,
      cpsObserved: await maxStartsInAnySecond(),
    });
    expect(restart, afterRequeue === 0, `active after requeue was ${afterRequeue}`);
    expect(restart, again === "reserved", `redial after restart returned ${again}`);
    expect(restart, third === "lost", `another worker after the redial got ${third}`);
    expect(restart, restartState.active === 1, `active after the recovered dial was ${restartState.active}`);
    expect(
      restart,
      (await IvrCallAttempt.countDocuments({ _id: crashId })) === 1,
      "restart created an extra attempt document"
    );

    const loadMax = { value: 0 };
    const load = scenario("load-800", "800 שיחות: 500 פעילות ו-300 בתור, מחולקות בין ארבעה אירועים");
    scenarios.push(load);
    await resetCalls();
    process.env.IVR_MAX_PARALLEL_CALLS = "500";
    process.env.IVR_OUTBOUND_CPS = "50";
    process.env.IVR_DIAL_TICK_SECONDS = "20";
    const seeded800 = await seedQueued(200);
    const loadStarted = Date.now();
    const filled = await fillToCapacity(loadMax);
    const loadState = await snapshot();
    const loadCps = await maxStartsInAnySecond();
    paint(load, loadState, {
      maxConcurrent: loadMax.value,
      dialed: filled.dialed,
      cpsObserved: loadCps,
      queueWaitMs: waitStats(filled.waits),
    });
    load.simulatedCalls = seeded800;
    const activeCounts = loadState.perCustomer.map((item) => item.active);
    const queuedCounts = loadState.perCustomer.map((item) => item.queued);
    expect(load, loadState.active === 500, `active was ${loadState.active}`);
    expect(load, loadState.queued === 300, `queued was ${loadState.queued}`);
    expect(load, loadMax.value === 500, `max concurrent observed ${loadMax.value}`);
    expect(load, loadMax.value <= 500, `max concurrent exceeded 500 (${loadMax.value})`);
    expect(load, filled.dialed === 500, `dialed ${filled.dialed}`);
    expect(load, loadCps <= 50, `CPS peak ${loadCps} while the cap was 50`);
    expect(load, activeCounts.every((count) => count === 125), `active per event ${activeCounts.join(",")}`);
    expect(load, queuedCounts.every((count) => count === 75), `queued per event ${queuedCounts.join(",")}`);
    expect(load, loadState.origins.regular === 250, `regular active ${loadState.origins.regular}`);
    expect(load, loadState.origins.kosher === 250, `kosher active ${loadState.origins.kosher}`);
    expect(load, loadState.origins.regular + loadState.origins.kosher === 500, "regular and kosher did not add up to one pool");
    load.notes.push(`מילוי 500 השיחות ארך ${Date.now() - loadStarted}ms ב-${filled.ticks} סבבי תור`);

    const capProbe = scenario("cap-probe", "ניסיון חיוג נוסף כשהקיבולת מלאה נשאר בתור");
    scenarios.push(capProbe);
    const probe = await IvrCallAttempt.findOne({ status: "queued" }).select("_id userId");
    const probeSlot = probe?._id ? await claim(probe._id as mongoose.Types.ObjectId) : "missing";
    const probeState = await snapshot();
    paint(capProbe, probeState, {
      maxConcurrent: probeState.active,
      dialed: 0,
      cpsObserved: loadCps,
    });
    capProbe.simulatedCalls = seeded800;
    expect(capProbe, probeSlot === "full", `extra dial returned ${probeSlot}`);
    expect(capProbe, probeState.active === 500, `active moved to ${probeState.active}`);
    expect(capProbe, probeState.queued === 300, `queue moved to ${probeState.queued}`);

    const scale1000 = scenario("load-1000", "1,000 שיחות: 500 פעילות ו-500 בתור");
    scenarios.push(scale1000);
    await seedQueued(50);
    const state1000 = await snapshot();
    const overflow1000 = await IvrCallAttempt.findOne({ status: "queued" }).select("_id");
    const overflowSlot = overflow1000?._id
      ? await claim(overflow1000._id as mongoose.Types.ObjectId)
      : "missing";
    paint(scale1000, state1000, {
      maxConcurrent: state1000.active,
      dialed: 0,
      cpsObserved: await maxStartsInAnySecond(),
    });
    scale1000.simulatedCalls = state1000.active + state1000.queued + state1000.completed + state1000.failed;
    expect(scale1000, scale1000.simulatedCalls === 1000, `documents in the simulation: ${scale1000.simulatedCalls}`);
    expect(scale1000, state1000.active === 500, `active at 1,000 was ${state1000.active}`);
    expect(scale1000, state1000.queued === 500, `queued at 1,000 was ${state1000.queued}`);
    expect(scale1000, overflowSlot === "full", `dial above the full pool returned ${overflowSlot}`);

    const scale2000 = scenario("load-2000", "2,000 שיחות: 500 פעילות ו-1,500 בתור");
    scenarios.push(scale2000);
    await seedQueued(250);
    const state2000 = await snapshot();
    paint(scale2000, state2000, {
      maxConcurrent: state2000.active,
      dialed: 0,
      cpsObserved: await maxStartsInAnySecond(),
    });
    scale2000.simulatedCalls = state2000.active + state2000.queued + state2000.completed + state2000.failed;
    expect(scale2000, scale2000.simulatedCalls === 2000, `documents in the simulation: ${scale2000.simulatedCalls}`);
    expect(scale2000, state2000.active === 500, `active at 2,000 was ${state2000.active}`);
    expect(scale2000, state2000.queued === 1500, `queued at 2,000 was ${state2000.queued}`);
    expect(
      scale2000,
      state2000.origins.regular + state2000.origins.kosher === 500,
      `shared pool at 2,000 was regular ${state2000.origins.regular} + kosher ${state2000.origins.kosher}`
    );

    const slotRelease = scenario("slot-release", "סיום שיחות מפנה מקום והתור יוצא אוטומטית לאותו אירוע");
    scenarios.push(slotRelease);
    await sleep(ivrPaceWaitMs());
    const behind = customers[0];
    const ending = await IvrCallAttempt.find({
      userId: behind.userId,
      status: "ringing",
    })
      .limit(40)
      .select("_id");
    const endedAt = Date.now();
    await IvrCallAttempt.updateMany(
      { _id: { $in: ending.map((row) => row._id) } },
      {
        $set: {
          status: "completed",
          flowStep: "done",
          phase: "COMPLETED",
          endedAt: new Date(),
          answered: true,
        },
      }
    );
    const replacement = await nextBatch(40);
    const releaseMax = { value: 0 };
    const releaseDial = await dialBatch(
      replacement.map((row) => row._id as mongoose.Types.ObjectId),
      releaseMax
    );
    const releaseState = await snapshot();
    const replacementUsers = new Set(replacement.map((row) => String(row.userId)));
    paint(slotRelease, releaseState, {
      maxConcurrent: Math.max(500, releaseMax.value),
      dialed: releaseDial.dialed,
      cpsObserved: await maxStartsInAnySecond(),
      queueWaitMs: waitStats(releaseDial.waits.map((wait) => endedAt + wait - endedAt)),
    });
    slotRelease.queueWaitMs = waitStats(releaseDial.waits);
    slotRelease.simulatedCalls = releaseState.active + releaseState.queued + releaseState.completed + releaseState.failed;
    expect(slotRelease, ending.length === 40, `completed ${ending.length} calls`);
    expect(slotRelease, releaseDial.dialed === 40, `replacements dialed ${releaseDial.dialed}`);
    expect(slotRelease, releaseState.active === 500, `active after refill was ${releaseState.active}`);
    expect(slotRelease, releaseState.queued === 1460, `queued after refill was ${releaseState.queued}`);
    expect(slotRelease, releaseState.completed === 40, `completed ${releaseState.completed}`);
    expect(
      slotRelease,
      replacementUsers.size === 1 && replacementUsers.has(String(behind.userId)),
      `replacements went to ${[...replacementUsers].map((id) => customerByUser(id)?.label || id).join(",")}`
    );
    expect(slotRelease, (slotRelease.queueWaitMs.first || 0) < 3000, `first replacement waited ${slotRelease.queueWaitMs.first}ms`);
    expect(slotRelease, releaseMax.value <= 500, `refill peaked at ${releaseMax.value}`);

    const failure = scenario("dial-failure", "כישלון חיוג משחרר מקום והשיחה הבאה יוצאת");
    scenarios.push(failure);
    await sleep(ivrPaceWaitMs());
    const failing = await IvrCallAttempt.findOne({
      userId: customers[1].userId,
      status: "ringing",
    }).select("_id");
    await IvrCallAttempt.updateOne(
      { _id: failing?._id },
      {
        $set: {
          status: "failed",
          flowStep: "done",
          endedAt: new Date(),
          error: "DIAL_FAILED",
          rsvpApplied: false,
        },
      }
    );
    const failReplacement = await nextBatch(1);
    const failMax = { value: 0 };
    const failStarted = Date.now();
    const failDial = await dialBatch(
      failReplacement.map((row) => row._id as mongoose.Types.ObjectId),
      failMax
    );
    const failureState = await snapshot();
    paint(failure, failureState, {
      maxConcurrent: failureState.active,
      dialed: failDial.dialed,
      cpsObserved: await maxStartsInAnySecond(),
      queueWaitMs: waitStats([Date.now() - failStarted]),
    });
    expect(failure, failDial.dialed === 1, `failure replacement dialed ${failDial.dialed}`);
    expect(failure, failureState.failed === 1, `failed count ${failureState.failed}`);
    expect(failure, failureState.active === 500, `active after failure was ${failureState.active}`);
    expect(
      failure,
      failReplacement.length === 1 && String(failReplacement[0].userId) === String(customers[1].userId),
      "the freed slot did not return to the event that lost a call"
    );

    const parallel = scenario("parallel-workers", "חמישה Workers במקביל לא עוברים 500 שיחות פעילות");
    scenarios.push(parallel);
    await resetCalls();
    const parallelSeeded = await seedQueued(200);
    const parallelMax = { value: 0 };
    const parallelViolations: number[] = [];
    const parallelStarted = Date.now();

    async function worker() {
      let dialed = 0;
      const deadline = Date.now() + 120000;
      while (dialed < 500 && Date.now() < deadline) {
        const active = await countActiveOutboundCalls();
        if (active > parallelMax.value) parallelMax.value = active;
        if (active > 500) parallelViolations.push(active);
        const batch = await nextBatch(1);
        if (!batch.length) break;
        const next = batch[0];
        const slot = await claim(next._id as mongoose.Types.ObjectId);
        if (slot === "paced") {
          await sleep(ivrPaceWaitMs());
          continue;
        }
        if (slot === "full") break;
        if (slot === "lost") continue;
        const after = await countActiveOutboundCalls();
        if (after > parallelMax.value) parallelMax.value = after;
        if (after > 500) parallelViolations.push(after);
        await mockDial(next._id as mongoose.Types.ObjectId);
        dialed += 1;
        if (after >= 500) break;
      }
      return dialed;
    }

    const workerDials = await Promise.all([worker(), worker(), worker(), worker(), worker()]);
    const parallelState = await snapshot();
    const parallelCps = await maxStartsInAnySecond();
    paint(parallel, parallelState, {
      maxConcurrent: parallelMax.value,
      dialed: workerDials.reduce((sum, count) => sum + count, 0),
      cpsObserved: parallelCps,
    });
    parallel.simulatedCalls = parallelSeeded;
    const parallelSpread =
      Math.max(...parallelState.perCustomer.map((item) => item.active)) -
      Math.min(...parallelState.perCustomer.map((item) => item.active));
    expect(parallel, parallelViolations.length === 0, `cap violations ${parallelViolations.join(",")}`);
    expect(parallel, parallelState.active === 500, `parallel active ${parallelState.active}`);
    expect(parallel, parallelState.queued === 300, `parallel queued ${parallelState.queued}`);
    expect(parallel, parallelMax.value <= 500, `parallel peak ${parallelMax.value}`);
    expect(parallel, workerDials.reduce((sum, count) => sum + count, 0) === 500, `workers dialed ${workerDials.join("+")}`);
    expect(parallel, workerDials.filter((count) => count > 0).length >= 2, "fewer than two workers placed calls");
    expect(parallel, parallelCps <= 50, `parallel CPS peak ${parallelCps}`);
    expect(parallel, parallelSpread <= 10, `active spread across events was ${parallelSpread}`);
    expect(
      parallel,
      parallelState.origins.regular > 0 && parallelState.origins.kosher > 0,
      `parallel origins regular ${parallelState.origins.regular} kosher ${parallelState.origins.kosher}`
    );
    parallel.notes.push(
      `חמישה Workers מילאו 500 מתוך 800 ב-${Date.now() - parallelStarted}ms. חלוקה: ${workerDials.join(", ")}`
    );

    const shared = scenario("shared-pool", "שיחות רגילות ושיחות כשרות נספרות באותה תקרת 500");
    scenarios.push(shared);
    paint(shared, parallelState, {
      maxConcurrent: parallelState.active,
      dialed: parallel.dialed,
      cpsObserved: parallelCps,
    });
    shared.simulatedCalls = parallelSeeded;
    expect(shared, parallelState.origins.regular + parallelState.origins.kosher === 500, "origins were not one pool");
    expect(shared, parallelState.origins.regular < 500 && parallelState.origins.kosher < 500, "one call type reached a private 500 cap");
    const regularQueued = await IvrCallAttempt.findOne({
      status: "queued",
      origin: { $ne: KOSHER_MESSAGE_ROUND_ORIGIN },
    }).select("_id");
    const kosherQueued = await IvrCallAttempt.findOne({
      status: "queued",
      origin: KOSHER_MESSAGE_ROUND_ORIGIN,
    }).select("_id");
    const regularSlot = regularQueued?._id
      ? await claim(regularQueued._id as mongoose.Types.ObjectId)
      : "missing";
    const kosherSlot = kosherQueued?._id
      ? await claim(kosherQueued._id as mongoose.Types.ObjectId)
      : "missing";
    expect(shared, regularSlot === "full", `regular overflow returned ${regularSlot}`);
    expect(shared, kosherSlot === "full", `kosher overflow returned ${kosherSlot}`);

    const report = {
      mode: "isolated-memory-simulation",
      realTelnyxCalls: 0,
      realWhatsAppOrSms: 0,
      blockedNetworkCalls,
      localProviderMocks: localDials,
      elapsedMs: Date.now() - startedAt,
      accountLimit: ivrMaxParallelCalls(),
      callsPerSecond: ivrOutboundCallsPerSecond(),
      scenarios,
    };
    console.log(`IVR_LOAD_SIM_REPORT ${JSON.stringify(report)}`);
    const failed = scenarios.filter((item) => !item.passed);
    assert.equal(
      failed.length,
      0,
      failed.map((item) => `${item.id}: ${item.notes.join(" | ")}`).join("\n")
    );
    assert.equal(blockedNetworkCalls, 0);
  } finally {
    process.env.IVR_MAX_PARALLEL_CALLS = savedEnv.IVR_MAX_PARALLEL_CALLS;
    process.env.IVR_OUTBOUND_CPS = savedEnv.IVR_OUTBOUND_CPS;
    process.env.IVR_DIAL_TICK_SECONDS = savedEnv.IVR_DIAL_TICK_SECONDS;
    process.env.IVR_ALLOW_LIVE_DIAL = savedEnv.IVR_ALLOW_LIVE_DIAL;
    process.env.VERCEL_ENV = savedEnv.VERCEL_ENV;
    if (savedEnv.TELNYX_API_KEY === undefined) delete process.env.TELNYX_API_KEY;
    else process.env.TELNYX_API_KEY = savedEnv.TELNYX_API_KEY;
    if (savedEnv.TELNYX_CONNECTION_ID === undefined) delete process.env.TELNYX_CONNECTION_ID;
    else process.env.TELNYX_CONNECTION_ID = savedEnv.TELNYX_CONNECTION_ID;
    if (savedEnv.IVR_ALLOW_LIVE_DIAL === undefined) delete process.env.IVR_ALLOW_LIVE_DIAL;
    if (savedEnv.VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
    if (savedEnv.IVR_MAX_PARALLEL_CALLS === undefined) delete process.env.IVR_MAX_PARALLEL_CALLS;
    if (savedEnv.IVR_OUTBOUND_CPS === undefined) delete process.env.IVR_OUTBOUND_CPS;
    if (savedEnv.IVR_DIAL_TICK_SECONDS === undefined) delete process.env.IVR_DIAL_TICK_SECONDS;
    globalThis.fetch = originalFetch;
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    if (mongod) await mongod.stop();
  }
});
