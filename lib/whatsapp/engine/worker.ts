/**
 * Worker for the new engine. It sends only when the caller passes a
 * sender. The public tick refuses to do that unless the mode is v2.
 */

import {
  compareRecipientIds,
  planWhatsappAudience,
  type AudiencePlan,
} from "@/lib/whatsapp/engine/audience";
import { whatsappEngineMode, type WhatsappEngineMode } from "@/lib/whatsapp/engine/mode";
import {
  createEngineJob,
  type EngineJob,
  type EngineStore,
  type StoredSchedule,
} from "@/lib/whatsapp/engine/store";

export class WhatsappProviderError extends Error {
  readonly code: string;
  readonly temporary: boolean;

  constructor(code: string, message: string, temporary: boolean) {
    super(message);
    this.name = "WhatsappProviderError";
    this.code = code;
    this.temporary = temporary;
  }
}

export function classifyProviderFailure(error: unknown) {
  if (error instanceof WhatsappProviderError) {
    return { code: error.code, temporary: error.temporary, message: error.message };
  }
  const message = error instanceof Error ? error.message : String(error);
  const codeMatch = message.match(/\b(1310\d\d)\b/);
  const code = codeMatch?.[1] || "PROVIDER_ERROR";
  const temporary =
    code === "131048" ||
    code === "131049" ||
    code === "131056" ||
    /rate|too many|timeout|ECONN|503|429/i.test(message);
  return { code, temporary, message };
}

export type EngineSender = (job: EngineJob) => Promise<{ messageId: string }>;

const DEFAULT_BACKOFF_MS = [1000, 5000, 15000];

function backoff(attempt: number) {
  return DEFAULT_BACKOFF_MS[Math.min(attempt - 1, DEFAULT_BACKOFF_MS.length - 1)];
}

export async function enqueuePlan(input: {
  store: EngineStore;
  plan: AudiencePlan;
  invitationId: string;
  scheduleId: string;
  type: string;
  round: number;
  now: Date;
}) {
  const created: EngineJob[] = [];
  const duplicates: string[] = [];
  if (input.plan.blockedReason) return { created, duplicates };
  for (const recipient of input.plan.recipients) {
    const job = createEngineJob({
      idempotencyKey: recipient.idempotencyKey,
      invitationId: input.invitationId,
      guestId: recipient.guestId,
      scheduleId: input.scheduleId,
      type: input.type,
      round: input.round,
      phone: recipient.phone,
      templateName: recipient.message.templateName,
      payload: {
        components: recipient.message.components,
        personalUrl: recipient.message.personalUrl,
        buttonUrlParam: recipient.message.buttonUrlParam,
        includeTableNumber: recipient.includeTableNumber,
      },
      now: input.now,
    });
    const result = await input.store.insertJob(job);
    if (result === "duplicate") duplicates.push(recipient.idempotencyKey);
    else created.push(job);
  }
  return { created, duplicates };
}

export async function executeDue(input: {
  store: EngineStore;
  now: Date;
  workerId: string;
  sender: EngineSender;
  limit?: number;
  stuckAfterMs?: number;
  delayMs?: number;
}) {
  const claimed = await input.store.claimJobs({
    now: input.now,
    workerId: input.workerId,
    limit: input.limit ?? 30,
    stuckAfterMs: input.stuckAfterMs ?? 10 * 60 * 1000,
  });
  let accepted = 0;
  let failed = 0;
  let retried = 0;
  const pausedInvitations = new Set<string>();

  for (const job of claimed) {
    if (pausedInvitations.has(job.invitationId)) {
      job.status = "pending";
      job.lockedAt = null;
      job.lockedBy = null;
      job.attempts = Math.max(0, job.attempts - 1);
      job.nextAttemptAt = new Date(input.now.getTime() + backoff(1)).toISOString();
      await input.store.saveJob(job);
      continue;
    }
    try {
      const components = job.payload.components;
      if (!Array.isArray(components) || components.length === 0) {
        throw new WhatsappProviderError(
          "TEMPLATE_COMPONENTS_REQUIRED",
          "template components are missing",
          false
        );
      }
      const sent = await input.sender(job);
      const messageId = String(sent.messageId || "").trim();
      if (!messageId) {
        throw new WhatsappProviderError("NOT_ACCEPTED", "provider did not accept the message", false);
      }
      job.status = "accepted";
      job.providerStatus = "sent";
      job.wamid = messageId;
      job.acceptedAt = input.now.toISOString();
      job.lockedAt = null;
      job.lockedBy = null;
      job.errorCode = "";
      job.errorMessage = "";
      await input.store.saveJob(job);
      accepted += 1;
    } catch (error) {
      const failure = classifyProviderFailure(error);
      const permanent = !failure.temporary || job.attempts >= job.maxAttempts;
      job.errorCode = failure.code;
      job.errorMessage = failure.message;
      job.lockedAt = null;
      job.lockedBy = null;
      if (permanent) {
        job.status = "failed";
        job.providerStatus = "failed";
        job.failedAt = input.now.toISOString();
        failed += 1;
      } else {
        job.status = "pending";
        job.providerStatus = "";
        job.nextAttemptAt = new Date(input.now.getTime() + backoff(job.attempts)).toISOString();
        retried += 1;
      }
      await input.store.saveJob(job);
      if (failure.temporary && (failure.code === "131048" || failure.code === "131056" || failure.code === "131049")) {
        pausedInvitations.add(job.invitationId);
        await input.store.deferInvitation(
          job.invitationId,
          new Date(input.now.getTime() + backoff(job.attempts)).toISOString()
        );
      }
    }
    if (input.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, input.delayMs));
    }
  }

  return { claimed: claimed.length, accepted, failed, retried };
}

export function applyProviderWebhook(job: EngineJob, status: string, now: Date) {
  const next = status.trim().toLowerCase();
  if (next === "delivered") {
    job.providerStatus = "delivered";
    job.deliveredAt = now.toISOString();
    return job;
  }
  if (next === "read") {
    job.providerStatus = "read";
    job.readAt = now.toISOString();
    if (!job.deliveredAt) job.deliveredAt = now.toISOString();
    return job;
  }
  if (next === "failed") {
    job.providerStatus = "failed";
    job.status = "failed";
    job.failedAt = now.toISOString();
    return job;
  }
  if (next === "sent" && job.status === "accepted") {
    job.providerStatus = "sent";
  }
  return job;
}

export type EngineTickResult = {
  mode: WhatsappEngineMode;
  executed: boolean;
  sent: number;
  failed: number;
  retried: number;
  blockedReason: string | null;
  expectedCount: number;
  duplicates: string[];
  plan: AudiencePlan | null;
  comparison: ReturnType<typeof compareRecipientIds> | null;
};

export async function runWhatsappEngineTick(input: {
  env?: unknown;
  store: EngineStore;
  schedule: StoredSchedule;
  planInput: Parameters<typeof planWhatsappAudience>[0];
  now: Date;
  workerId: string;
  sender: EngineSender;
  legacyRecipientIds?: string[];
  limit?: number;
  stuckAfterMs?: number;
}): Promise<EngineTickResult> {
  const mode = whatsappEngineMode(input.env);
  const idle: EngineTickResult = {
    mode,
    executed: false,
    sent: 0,
    failed: 0,
    retried: 0,
    blockedReason: null,
    expectedCount: 0,
    duplicates: [],
    plan: null,
    comparison: null,
  };
  if (mode === "shadow") {
    const plan = planWhatsappAudience(input.planInput);
    return {
      ...idle,
      mode,
      plan,
      expectedCount: plan.expectedCount,
      blockedReason: plan.blockedReason,
      comparison: compareRecipientIds(
        input.legacyRecipientIds || [],
        plan.recipients.map((row) => row.guestId)
      ),
    };
  }
  if (mode !== "v2") return idle;

  const existing = await input.store.getSchedule(input.schedule.id);
  if (!existing) await input.store.saveSchedule(input.schedule);
  const gate = await input.store.beginSchedule(input.schedule.id, input.now, input.workerId);
  let plan: AudiencePlan | null = null;
  let duplicates: string[] = [];
  if (gate === "claimed") {
    plan = planWhatsappAudience(input.planInput);
    if (!plan.blockedReason) {
      const enqueued = await enqueuePlan({
        store: input.store,
        plan,
        invitationId: input.schedule.invitationId,
        scheduleId: input.schedule.id,
        type: String(input.planInput.schedule.type || "custom"),
        round: Number(input.planInput.schedule.round || input.planInput.schedule.roundNumber || 1),
        now: input.now,
      });
      duplicates = enqueued.duplicates;
    }
  } else if (gate === "cancelled") {
    return { ...idle, mode, blockedReason: "SCHEDULE_CANCELLED" };
  }
  const work = await executeDue({
    store: input.store,
    now: input.now,
    workerId: input.workerId,
    sender: input.sender,
    limit: input.limit,
    stuckAfterMs: input.stuckAfterMs,
  });
  await input.store.completeSchedule(input.schedule.id);
  return {
    mode,
    executed: true,
    sent: work.accepted,
    failed: work.failed,
    retried: work.retried,
    blockedReason: plan?.blockedReason || null,
    expectedCount: plan?.expectedCount || 0,
    duplicates,
    plan,
    comparison: null,
  };
}
