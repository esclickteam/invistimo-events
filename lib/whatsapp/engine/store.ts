/**
 * In-memory engine store. A later cutover can implement the same
 * interface on a new Mongo collection. It must not write WhatsappQueue
 * or ScheduledMessage.
 */

export type EngineJobStatus =
  | "pending"
  | "sending"
  | "accepted"
  | "failed"
  | "cancelled";

export type ProviderDeliveryStatus = "" | "sent" | "delivered" | "read" | "failed";

export type EngineJob = {
  id: string;
  idempotencyKey: string;
  invitationId: string;
  guestId: string;
  scheduleId: string;
  type: string;
  round: number;
  phone: string;
  templateName: string;
  payload: Record<string, unknown>;
  status: EngineJobStatus;
  providerStatus: ProviderDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  lockedAt: string | null;
  lockedBy: string | null;
  nextAttemptAt: string | null;
  acceptedAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  errorCode: string;
  errorMessage: string;
  wamid: string;
  createdAt: string;
};

export type StoredSchedule = {
  id: string;
  invitationId: string;
  status: "scheduled" | "running" | "completed" | "cancelled";
  scheduledAt: string | null;
  enqueued: boolean;
  lockedBy: string | null;
};

export type EngineStore = {
  saveSchedule(schedule: StoredSchedule): Promise<void>;
  getSchedule(id: string): Promise<StoredSchedule | null>;
  beginSchedule(id: string, now: Date, workerId: string): Promise<
    "missing" | "not_due" | "cancelled" | "already_enqueued" | "claimed"
  >;
  completeSchedule(id: string): Promise<void>;
  cancelSchedule(id: string): Promise<void>;
  reschedule(id: string, scheduledAt: string | null): Promise<"updated" | "locked" | "missing">;
  insertJob(job: EngineJob): Promise<"created" | "duplicate">;
  claimJobs(input: {
    now: Date;
    workerId: string;
    limit: number;
    stuckAfterMs: number;
  }): Promise<EngineJob[]>;
  saveJob(job: EngineJob): Promise<void>;
  deferInvitation(invitationId: string, nextAttemptAt: string): Promise<void>;
  jobsForSchedule(scheduleId: string): Promise<EngineJob[]>;
  snapshot(): Promise<{ schedules: StoredSchedule[]; jobs: EngineJob[] }>;
  restore(snapshot: { schedules: StoredSchedule[]; jobs: EngineJob[] }): Promise<void>;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createMemoryEngineStore(): EngineStore {
  const schedules = new Map<string, StoredSchedule>();
  const jobs = new Map<string, EngineJob>();
  const byKey = new Map<string, string>();

  return {
    async saveSchedule(schedule) {
      schedules.set(schedule.id, clone(schedule));
    },
    async getSchedule(id) {
      const found = schedules.get(id);
      return found ? clone(found) : null;
    },
    async beginSchedule(id, now, workerId) {
      const schedule = schedules.get(id);
      if (!schedule) return "missing";
      if (schedule.status === "cancelled") return "cancelled";
      if (schedule.enqueued) return "already_enqueued";
      if (schedule.scheduledAt && Date.parse(schedule.scheduledAt) > now.getTime()) {
        return "not_due";
      }
      schedule.enqueued = true;
      schedule.status = "running";
      schedule.lockedBy = workerId;
      return "claimed";
    },
    async completeSchedule(id) {
      const schedule = schedules.get(id);
      if (!schedule || schedule.status === "cancelled") return;
      const open = [...jobs.values()].some(
        (job) =>
          job.scheduleId === id &&
          (job.status === "pending" || job.status === "sending")
      );
      if (!open && schedule.enqueued) schedule.status = "completed";
    },
    async cancelSchedule(id) {
      const schedule = schedules.get(id);
      if (!schedule) return;
      schedule.status = "cancelled";
      for (const job of jobs.values()) {
        if (job.scheduleId === id && (job.status === "pending" || job.status === "sending")) {
          job.status = "cancelled";
          job.lockedAt = null;
          job.lockedBy = null;
        }
      }
    },
    async reschedule(id, scheduledAt) {
      const schedule = schedules.get(id);
      if (!schedule) return "missing";
      if (schedule.enqueued || schedule.status === "running" || schedule.status === "completed") {
        return "locked";
      }
      schedule.scheduledAt = scheduledAt;
      schedule.status = "scheduled";
      return "updated";
    },
    async insertJob(job) {
      if (byKey.has(job.idempotencyKey)) return "duplicate";
      jobs.set(job.id, clone(job));
      byKey.set(job.idempotencyKey, job.id);
      return "created";
    },
    async claimJobs({ now, workerId, limit, stuckAfterMs }) {
      const due = [...jobs.values()]
        .filter((job) => {
          if (job.status === "pending") {
            if (job.attempts >= job.maxAttempts) return false;
            if (job.nextAttemptAt && Date.parse(job.nextAttemptAt) > now.getTime()) return false;
            return true;
          }
          if (job.status === "sending" && job.lockedAt) {
            return now.getTime() - Date.parse(job.lockedAt) >= stuckAfterMs;
          }
          return false;
        })
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      const claimed: EngineJob[] = [];
      for (const job of due) {
        if (claimed.length >= limit) break;
        if (job.status === "pending") job.attempts += 1;
        job.status = "sending";
        job.lockedAt = now.toISOString();
        job.lockedBy = workerId;
        claimed.push(clone(job));
      }
      return claimed;
    },
    async saveJob(job) {
      jobs.set(job.id, clone(job));
    },
    async deferInvitation(invitationId, nextAttemptAt) {
      for (const job of jobs.values()) {
        if (job.invitationId === invitationId && job.status === "pending") {
          job.nextAttemptAt = nextAttemptAt;
        }
      }
    },
    async jobsForSchedule(scheduleId) {
      return [...jobs.values()]
        .filter((job) => job.scheduleId === scheduleId)
        .map((job) => clone(job));
    },
    async snapshot() {
      return {
        schedules: [...schedules.values()].map((row) => clone(row)),
        jobs: [...jobs.values()].map((row) => clone(row)),
      };
    },
    async restore(snapshot) {
      schedules.clear();
      jobs.clear();
      byKey.clear();
      for (const schedule of snapshot.schedules) schedules.set(schedule.id, clone(schedule));
      for (const job of snapshot.jobs) {
        jobs.set(job.id, clone(job));
        byKey.set(job.idempotencyKey, job.id);
      }
    },
  };
}

let jobSequence = 0;

export function createEngineJob(input: {
  idempotencyKey: string;
  invitationId: string;
  guestId: string;
  scheduleId: string;
  type: string;
  round: number;
  phone: string;
  templateName: string;
  payload: Record<string, unknown>;
  now: Date;
  maxAttempts?: number;
}): EngineJob {
  jobSequence += 1;
  return {
    id: `job_${jobSequence}_${input.guestId}`,
    idempotencyKey: input.idempotencyKey,
    invitationId: input.invitationId,
    guestId: input.guestId,
    scheduleId: input.scheduleId,
    type: input.type,
    round: input.round,
    phone: input.phone,
    templateName: input.templateName,
    payload: input.payload,
    status: "pending",
    providerStatus: "",
    attempts: 0,
    maxAttempts: input.maxAttempts ?? 3,
    lockedAt: null,
    lockedBy: null,
    nextAttemptAt: null,
    acceptedAt: null,
    deliveredAt: null,
    readAt: null,
    failedAt: null,
    errorCode: "",
    errorMessage: "",
    wamid: "",
    createdAt: input.now.toISOString(),
  };
}
