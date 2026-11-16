import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { parseCallRoundScheduledAt } from "../../lib/calls/callRoundScheduleTime";
import {
  applyProviderWebhook,
  buildEngineTemplateMessage,
  compareRecipientIds,
  createMemoryEngineStore,
  decideWhatsappHeader,
  enqueuePlan,
  executeDue,
  planWhatsappAudience,
  readWhatsappHeader,
  runWhatsappEngineTick,
  whatsappEngineMode,
  WhatsappProviderError,
  ENGINE_TEMPLATE_NAMES,
} from "../../lib/whatsapp/engine";
import { createEngineJob } from "../../lib/whatsapp/engine/store";
import type { EngineGuest } from "../../lib/whatsapp/engine/audience";
import type { EngineSender } from "../../lib/whatsapp/engine/worker";
import type { StoredSchedule } from "../../lib/whatsapp/engine/store";

const NOW = new Date("2026-11-16T18:00:00.000Z");
const HEADER = { mode: "link" as const, link: "https://cdn.example/invitation.jpg" };

function guest(partial: Partial<EngineGuest> & { _id: string }): EngineGuest {
  return {
    invitationId: "inv-1",
    phone: "0507654321",
    rsvp: "pending",
    token: `tok-${partial._id}`,
    name: partial._id,
    ...partial,
  };
}

function schedule(partial: Partial<StoredSchedule> = {}): StoredSchedule {
  return {
    id: "sched-1",
    invitationId: "inv-1",
    status: "scheduled",
    scheduledAt: null,
    enqueued: false,
    lockedBy: null,
    ...partial,
  };
}

function planInput(overrides: Record<string, unknown> = {}) {
  return {
    invitationId: "inv-1",
    scheduleId: "sched-1",
    schedule: { type: "rsvp", round: 1, filter: "all", templateName: ENGINE_TEMPLATE_NAMES.rsvpRound1 },
    guests: [guest({ _id: "g1" }), guest({ _id: "g2", rsvp: "yes" }), guest({ _id: "g3", rsvp: "no" })],
    shareId: "share1",
    eventTitle: "החתונה של נועה",
    eventDate: "16.11.2026",
    eventLocation: "אולם הדקל",
    header: HEADER,
    templateName: ENGINE_TEMPLATE_NAMES.rsvpRound1,
    ...overrides,
  };
}

function senderCounter() {
  const calls: string[] = [];
  const sender: EngineSender = async (job) => {
    calls.push(job.guestId);
    return { messageId: `wamid-${job.guestId}` };
  };
  return { calls, sender };
}

test("engine mode stays on the legacy worker unless shadow or v2 is set", () => {
  assert.equal(whatsappEngineMode(undefined), "legacy");
  assert.equal(whatsappEngineMode(""), "legacy");
  assert.equal(whatsappEngineMode("link"), "legacy");
  assert.equal(whatsappEngineMode("shadow"), "shadow");
  assert.equal(whatsappEngineMode("v2"), "v2");
});

test("the live cron and scheduled worker do not import the new engine", () => {
  const cron = fs.readFileSync("app/api/cron/whatsapp/route.ts", "utf8");
  const worker = fs.readFileSync("workers/sendScheduledSms.ts", "utf8");
  assert.equal(cron.includes("whatsapp/engine"), false);
  assert.equal(worker.includes("whatsapp/engine"), false);
});

test("legacy and shadow do not send or write jobs", async () => {
  const store = createMemoryEngineStore();
  const { calls, sender } = senderCounter();
  const legacy = await runWhatsappEngineTick({
    store,
    schedule: schedule(),
    planInput: planInput(),
    now: NOW,
    workerId: "worker-a",
    sender,
  });
  assert.equal(legacy.executed, false);
  assert.equal(legacy.sent, 0);
  const shadow = await runWhatsappEngineTick({
    env: "shadow",
    store,
    schedule: schedule(),
    planInput: planInput(),
    now: NOW,
    workerId: "worker-a",
    sender,
    legacyRecipientIds: ["g1", "g2", "g3"],
  });
  assert.equal(shadow.executed, false);
  assert.equal(shadow.expectedCount, 3);
  assert.equal(shadow.comparison?.same, true);
  assert.deepEqual(calls, []);
  assert.equal((await store.snapshot()).jobs.length, 0);
});

test("round audiences keep the existing eligibility rules", () => {
  const guests = [
    guest({ _id: "pending" }),
    guest({ _id: "yes", rsvp: "yes" }),
    guest({ _id: "no", rsvp: "no" }),
    guest({ _id: "maybe", rsvp: "maybe" }),
    guest({ _id: "bad", phone: "123" }),
    guest({ _id: "blank", phone: "" }),
    guest({ _id: "other", invitationId: "inv-2" }),
  ];
  const round1 = planWhatsappAudience(planInput({ guests }));
  assert.deepEqual(round1.recipients.map((row) => row.guestId), ["pending", "yes", "no", "maybe"]);
  assert.deepEqual(round1.skipped.map((row) => row.reason), ["INVALID_PHONE", "MISSING_PHONE"]);

  const round2 = planWhatsappAudience(
    planInput({
      guests,
      templateName: ENGINE_TEMPLATE_NAMES.rsvpRound2,
      schedule: { type: "rsvp", round: 2, filter: "pending" },
    })
  );
  assert.deepEqual(round2.recipients.map((row) => row.guestId), ["pending", "bad", "blank"].filter((id) => id === "pending"));
  assert.equal(round2.recipients.length, 1);

  const round3 = planWhatsappAudience(
    planInput({
      guests,
      schedule: { type: "rsvp", round: 3, filter: "pending" },
    })
  );
  assert.deepEqual(round3.recipients.map((row) => row.guestId), ["pending"]);
});

test("a guest who answers before the scheduled run is left out of a later round", () => {
  const guests = [guest({ _id: "g1", rsvp: "pending" })];
  const before = planWhatsappAudience(
    planInput({ guests, schedule: { type: "rsvp", round: 2, filter: "pending" } })
  );
  assert.equal(before.expectedCount, 1);
  guests[0].rsvp = "yes";
  const atSend = planWhatsappAudience(
    planInput({ guests, schedule: { type: "rsvp", round: 2, filter: "pending" } })
  );
  assert.equal(atSend.expectedCount, 0);
});

test("reminder table text follows the guest and the event hide rules", () => {
  const guests = [
    guest({ _id: "seated", rsvp: "yes", tableName: "12" }),
    guest({ _id: "open", rsvp: "yes" }),
    guest({ _id: "hidden", rsvp: "yes", tableId: "t-hide", tableNumber: 4 }),
    guest({ _id: "pending", rsvp: "pending", tableName: "1" }),
  ];
  const reminder = planWhatsappAudience(
    planInput({
      guests,
      templateName: ENGINE_TEMPLATE_NAMES.thankYou,
      schedule: { type: "reminder", filter: "all" },
    })
  );
  const byId = new Map(reminder.recipients.map((row) => [row.guestId, row.includeTableNumber]));
  assert.equal(byId.get("seated"), true);
  assert.equal(byId.get("open"), false);
  assert.equal(byId.has("pending"), false);

  const hidden = planWhatsappAudience(
    planInput({
      guests,
      templateName: ENGINE_TEMPLATE_NAMES.thankYou,
      schedule: { type: "reminder", filter: "all" },
      hiddenTableIds: ["t-hide"],
    })
  );
  assert.equal(hidden.recipients.find((row) => row.guestId === "hidden")?.includeTableNumber, false);

  const withTable = planWhatsappAudience(
    planInput({
      guests,
      templateName: ENGINE_TEMPLATE_NAMES.table,
      schedule: { type: "table", filter: "withTable" },
    })
  );
  assert.deepEqual(withTable.recipients.map((row) => row.guestId).sort(), ["hidden", "seated"]);
});

test("kosher RSVP guests stay out of the WhatsApp list", () => {
  const plan = planWhatsappAudience(
    planInput({
      kosherEnabled: true,
      kosherPrefixes: [{ prefix: "052", active: true }],
      guests: [
        guest({ _id: "regular", phone: "0507654321" }),
        guest({ _id: "kosher", phone: "0527654321" }),
      ],
    })
  );
  assert.deepEqual(plan.recipients.map((row) => row.guestId), ["regular"]);
  assert.deepEqual(plan.kosherGuestIds, ["kosher"]);
});

test("guards and quota block a run without creating jobs", async () => {
  const store = createMemoryEngineStore();
  const { calls, sender } = senderCounter();
  const blocked = await runWhatsappEngineTick({
    env: "v2",
    store,
    schedule: schedule(),
    planInput: planInput({ guards: { roundAlreadySent: true } }),
    now: NOW,
    workerId: "worker-a",
    sender,
  });
  assert.equal(blocked.blockedReason, "ROUND_ALREADY_SENT");
  assert.equal(blocked.sent, 0);
  const quota = planWhatsappAudience(planInput({ quotaRemaining: 1 }));
  assert.equal(quota.blockedReason, "QUOTA_EXHAUSTED");
  assert.equal(quota.expectedCount, 0);
  assert.deepEqual(calls, []);
});

test("an immediate round is accepted by the provider and is not marked delivered", async () => {
  const store = createMemoryEngineStore();
  const { calls, sender } = senderCounter();
  const result = await runWhatsappEngineTick({
    env: "v2",
    store,
    schedule: schedule(),
    planInput: planInput(),
    now: NOW,
    workerId: "worker-a",
    sender,
  });
  assert.equal(result.expectedCount, 3);
  assert.equal(result.sent, 3);
  assert.deepEqual(calls, ["g1", "g2", "g3"]);
  const jobs = await store.jobsForSchedule("sched-1");
  assert.equal(jobs.every((job) => job.status === "accepted"), true);
  assert.equal(jobs.every((job) => job.providerStatus === "sent"), true);
  assert.equal(jobs.every((job) => job.deliveredAt == null), true);

  const updated = applyProviderWebhook(jobs[0], "delivered", NOW);
  assert.equal(updated.status, "accepted");
  assert.equal(updated.providerStatus, "delivered");
  const read = applyProviderWebhook(updated, "read", NOW);
  assert.equal(read.providerStatus, "read");
  const failed = applyProviderWebhook(jobs[1], "failed", NOW);
  assert.equal(failed.status, "failed");
  assert.equal(failed.providerStatus, "failed");
});

test("the personal button suffix is the share id and token", () => {
  const message = buildEngineTemplateMessage({
    to: "972501112233",
    type: "rsvp",
    templateName: ENGINE_TEMPLATE_NAMES.rsvpRound1,
    guestName: "דנה",
    shareId: "share1",
    token: "tok-g1",
    eventTitle: "אירוע",
    eventDate: "16.11.2026",
    eventLocation: "אולם",
    header: HEADER,
    includeTableNumber: false,
    tableName: "",
  });
  assert.equal(message.templateName, "rsvp_invitation_media");
  assert.equal(message.buttonUrlParam, "share1?token=tok-g1");
  assert.match(message.personalUrl, /\/invite\/share1\?token=tok-g1/);
  const button = message.components.find((row) => row.type === "button") as {
    parameters: Array<{ text: string }>;
  };
  assert.equal(button.parameters[0].text, "share1?token=tok-g1");
});

test("invitation-only keeps the approved template name", () => {
  const plan = planWhatsappAudience(
    planInput({
      templateName: "event_invitation_image_he",
      schedule: { type: "invitation_only", filter: "all" },
      guests: [guest({ _id: "g1" })],
    })
  );
  assert.equal(plan.recipients[0].message.templateName, "event_invitation");
});

test("a second tick does not send the same guest again", async () => {
  const store = createMemoryEngineStore();
  const { calls, sender } = senderCounter();
  const input = {
    env: "v2",
    store,
    schedule: schedule(),
    planInput: planInput({ guests: [guest({ _id: "g1" })] }),
    now: NOW,
    workerId: "worker-a",
    sender,
  };
  await runWhatsappEngineTick(input);
  await runWhatsappEngineTick(input);
  assert.deepEqual(calls, ["g1"]);
});

test("enqueue of the same key is a duplicate", async () => {
  const store = createMemoryEngineStore();
  const plan = planWhatsappAudience(planInput({ guests: [guest({ _id: "g1" })] }));
  const first = await enqueuePlan({
    store,
    plan,
    invitationId: "inv-1",
    scheduleId: "sched-1",
    type: "rsvp",
    round: 1,
    now: NOW,
  });
  const second = await enqueuePlan({
    store,
    plan,
    invitationId: "inv-1",
    scheduleId: "sched-1",
    type: "rsvp",
    round: 1,
    now: NOW,
  });
  assert.equal(first.created.length, 1);
  assert.equal(second.duplicates.length, 1);
});

test("a future Israel schedule waits, a missed one runs once, and cancel sends nothing", async () => {
  const later = parseCallRoundScheduledAt("2026-11-16T22:30");
  assert.ok(later);
  const store = createMemoryEngineStore();
  const { calls, sender } = senderCounter();
  const future = schedule({ scheduledAt: later.toISOString() });
  await store.saveSchedule(future);
  const waiting = await runWhatsappEngineTick({
    env: "v2",
    store,
    schedule: future,
    planInput: planInput({ guests: [guest({ _id: "g1" })] }),
    now: new Date(later.getTime() - 60_000),
    workerId: "worker-a",
    sender,
  });
  assert.equal(waiting.sent, 0);
  assert.equal(await store.reschedule("sched-1", new Date(later.getTime() - 120_000).toISOString()), "updated");
  const missed = await runWhatsappEngineTick({
    env: "v2",
    store,
    schedule: future,
    planInput: planInput({ guests: [guest({ _id: "g1" })] }),
    now: later,
    workerId: "worker-a",
    sender,
  });
  assert.equal(missed.sent, 1);
  await runWhatsappEngineTick({
    env: "v2",
    store,
    schedule: future,
    planInput: planInput({ guests: [guest({ _id: "g1" })] }),
    now: later,
    workerId: "worker-a",
    sender,
  });
  assert.deepEqual(calls, ["g1"]);

  const cancelledStore = createMemoryEngineStore();
  const cancelled = schedule({ id: "sched-cancel", scheduledAt: null });
  await cancelledStore.saveSchedule(cancelled);
  await cancelledStore.cancelSchedule("sched-cancel");
  const { calls: cancelCalls, sender: cancelSender } = senderCounter();
  const result = await runWhatsappEngineTick({
    env: "v2",
    store: cancelledStore,
    schedule: cancelled,
    planInput: planInput({ scheduleId: "sched-cancel" }),
    now: NOW,
    workerId: "worker-a",
    sender: cancelSender,
  });
  assert.equal(result.blockedReason, "SCHEDULE_CANCELLED");
  assert.deepEqual(cancelCalls, []);
});

test("changing the send time before the run uses the new time", async () => {
  const original = parseCallRoundScheduledAt("2026-11-17T09:00");
  const moved = parseCallRoundScheduledAt("2026-11-17T11:00");
  assert.ok(original && moved);
  const store = createMemoryEngineStore();
  await store.saveSchedule(schedule({ scheduledAt: original.toISOString() }));
  const { calls, sender } = senderCounter();
  await runWhatsappEngineTick({
    env: "v2",
    store,
    schedule: schedule({ scheduledAt: original.toISOString() }),
    planInput: planInput({ guests: [guest({ _id: "g1" })] }),
    now: new Date(original.getTime() - 60_000),
    workerId: "worker-a",
    sender,
  });
  assert.equal(calls.length, 0);
  assert.equal(await store.reschedule("sched-1", moved.toISOString()), "updated");
  await runWhatsappEngineTick({
    env: "v2",
    store,
    schedule: schedule({ scheduledAt: moved.toISOString() }),
    planInput: planInput({ guests: [guest({ _id: "g1" })] }),
    now: new Date(original.getTime() + 1000),
    workerId: "worker-a",
    sender,
  });
  assert.equal(calls.length, 0);
  await runWhatsappEngineTick({
    env: "v2",
    store,
    schedule: schedule({ scheduledAt: moved.toISOString() }),
    planInput: planInput({ guests: [guest({ _id: "g1" })] }),
    now: moved,
    workerId: "worker-a",
    sender,
  });
  assert.deepEqual(calls, ["g1"]);
});

test("a crashed worker retries the locked job and a restored store does not resend", async () => {
  const store = createMemoryEngineStore();
  const plan = planWhatsappAudience(planInput({ guests: [guest({ _id: "g1" })] }));
  await enqueuePlan({
    store,
    plan,
    invitationId: "inv-1",
    scheduleId: "sched-1",
    type: "rsvp",
    round: 1,
    now: NOW,
  });
  const claimed = await store.claimJobs({
    now: NOW,
    workerId: "worker-a",
    limit: 10,
    stuckAfterMs: 60_000,
  });
  assert.equal(claimed.length, 1);
  assert.equal(claimed[0].status, "sending");
  const snap = await store.snapshot();
  const restored = createMemoryEngineStore();
  await restored.restore(snap);
  const { calls, sender } = senderCounter();
  const recovered = await executeDue({
    store: restored,
    now: new Date(NOW.getTime() + 60_000),
    workerId: "worker-b",
    sender,
    stuckAfterMs: 60_000,
  });
  assert.equal(recovered.accepted, 1);
  await executeDue({
    store: restored,
    now: new Date(NOW.getTime() + 120_000),
    workerId: "worker-b",
    sender,
    stuckAfterMs: 60_000,
  });
  assert.deepEqual(calls, ["g1"]);
});

test("a provider failure stays on that event and a rate limit does not stop another event", async () => {
  const store = createMemoryEngineStore();
  const now = NOW;
  await store.insertJob(createEngineJob({
    idempotencyKey: "a",
    invitationId: "inv-a",
    guestId: "a1",
    scheduleId: "sa",
    type: "rsvp",
    round: 1,
    phone: "972501111111",
    templateName: ENGINE_TEMPLATE_NAMES.rsvpRound1,
    payload: { components: [{ type: "body" }] },
    now,
    maxAttempts: 1,
  }));
  await store.insertJob(createEngineJob({
    idempotencyKey: "a2",
    invitationId: "inv-a",
    guestId: "a2",
    scheduleId: "sa",
    type: "rsvp",
    round: 1,
    phone: "972501111112",
    templateName: ENGINE_TEMPLATE_NAMES.rsvpRound1,
    payload: { components: [{ type: "body" }] },
    now,
    maxAttempts: 3,
  }));
  await store.insertJob(createEngineJob({
    idempotencyKey: "b",
    invitationId: "inv-b",
    guestId: "b1",
    scheduleId: "sb",
    type: "rsvp",
    round: 1,
    phone: "972502222222",
    templateName: ENGINE_TEMPLATE_NAMES.rsvpRound1,
    payload: { components: [{ type: "body" }] },
    now,
  }));
  const calls: string[] = [];
  const result = await executeDue({
    store,
    now,
    workerId: "worker-a",
    sender: async (job) => {
      calls.push(job.guestId);
      if (job.invitationId === "inv-a") {
        throw new WhatsappProviderError("131048", "rate limit", true);
      }
      return { messageId: "wamid-b" };
    },
  });
  assert.equal(result.accepted, 1);
  assert.ok(calls.includes("b1"));
  const snap = await store.snapshot();
  const second = snap.jobs.find((job) => job.guestId === "a2");
  assert.equal(second?.status, "pending");
  assert.ok(second?.nextAttemptAt);
});

test("a permanent provider error fails that job and leaves another event accepted", async () => {
  const store = createMemoryEngineStore();
  await store.insertJob(createEngineJob({
    idempotencyKey: "bad",
    invitationId: "inv-a",
    guestId: "bad",
    scheduleId: "sa",
    type: "rsvp",
    round: 1,
    phone: "972501111111",
    templateName: "unknown_template",
    payload: { components: [] },
    now: NOW,
  }));
  await store.insertJob(createEngineJob({
    idempotencyKey: "good",
    invitationId: "inv-b",
    guestId: "good",
    scheduleId: "sb",
    type: "thankyou",
    round: 1,
    phone: "972502222222",
    templateName: ENGINE_TEMPLATE_NAMES.thankYou,
    payload: { components: [{ type: "body", parameters: [{ type: "text", text: "דנה" }] }] },
    now: NOW,
  }));
  const calls: string[] = [];
  await executeDue({
    store,
    now: NOW,
    workerId: "worker-a",
    sender: async (job) => {
      calls.push(job.guestId);
      return { messageId: `ok-${job.guestId}` };
    },
  });
  const jobs = (await store.snapshot()).jobs;
  assert.equal(jobs.find((job) => job.guestId === "bad")?.status, "failed");
  assert.equal(jobs.find((job) => job.guestId === "good")?.status, "accepted");
  assert.deepEqual(calls, ["good"]);
});

test("header bytes are kept and the bubble layout stays with WhatsApp", async () => {
  const sharp = (await import("sharp")).default;
  const portrait = await sharp({
    create: { width: 90, height: 160, channels: 3, background: { r: 20, g: 40, b: 80 } },
  })
    .jpeg()
    .toBuffer();
  const prepared = await readWhatsappHeader(portrait);
  assert.equal(prepared.width, 90);
  assert.equal(prepared.height, 160);
  assert.equal(prepared.bytes, portrait);
  assert.equal(prepared.resized, false);
  assert.equal(prepared.padded, false);
  assert.equal(prepared.cropped, false);
  assert.equal(prepared.layoutControlledBy, "whatsapp-template-header");
  assert.equal(
    decideWhatsappHeader({ kind: "jpeg", width: 1080, height: 1920, byteLength: 1000 }).action,
    "keep"
  );
  assert.equal(
    decideWhatsappHeader({ kind: "jpeg", width: 5000, height: 1000, byteLength: 1000 }).action,
    "reject"
  );
  assert.equal(decideWhatsappHeader({ kind: "other", width: 10, height: 10, byteLength: 10 }).action, "reject");
});

test("shadow comparison reports an audience drift", () => {
  const compared = compareRecipientIds(["g1", "g2"], ["g1"]);
  assert.equal(compared.same, false);
  assert.deepEqual(compared.onlyLegacy, ["g2"]);
});
