import { JobStatus, JobType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { processThumbnailJob } from "./media/thumbnails";
import { processVideoJob } from "./media/video";
import { processFaceIndexJob } from "./ai/face-provider";

export async function enqueueJob(params: {
  type: JobType;
  tenantId?: string;
  eventId?: string;
  payload?: Record<string, unknown>;
  runAfter?: Date;
}) {
  return prisma.backgroundJob.create({
    data: {
      type: params.type,
      tenantId: params.tenantId,
      eventId: params.eventId,
      payloadJson: JSON.stringify(params.payload || {}),
      runAfter: params.runAfter || new Date(),
      status: "QUEUED",
    },
  });
}

export async function processNextJobs(limit = 5) {
  const jobs = await prisma.backgroundJob.findMany({
    where: {
      status: "QUEUED",
      runAfter: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const results = [];
  for (const job of jobs) {
    const claimed = await prisma.backgroundJob.updateMany({
      where: { id: job.id, status: "QUEUED" },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
    if (claimed.count === 0) continue;

    try {
      const payload = JSON.parse(job.payloadJson || "{}") as Record<string, unknown>;
      let result: Record<string, unknown> = {};
      switch (job.type) {
        case "THUMBNAIL":
          result = await processThumbnailJob(payload);
          break;
        case "VIDEO_TRANSCODE":
        case "VIDEO_POSTER":
          result = await processVideoJob(job.type, payload);
          break;
        case "FACE_INDEX":
          result = await processFaceIndexJob(payload);
          break;
        default:
          result = { skipped: true, reason: `Handler not implemented for ${job.type}` };
      }
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: "SUCCEEDED" satisfies JobStatus,
          resultJson: JSON.stringify(result),
          finishedAt: new Date(),
        },
      });
      results.push({ id: job.id, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const attempts = job.attempts + 1;
      const failed = attempts >= job.maxAttempts;
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: failed ? "FAILED" : "QUEUED",
          lastError: message,
          runAfter: failed ? new Date() : new Date(Date.now() + attempts * 30_000),
          finishedAt: failed ? new Date() : null,
        },
      });
      results.push({ id: job.id, ok: false, error: message });
    }
  }
  return results;
}

export type JobPayload = Prisma.JsonObject;
