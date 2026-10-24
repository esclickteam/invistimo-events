import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "../prisma";
import { absPathForKey, buildObjectKey, putBuffer } from "../storage";

const execFileAsync = promisify(execFile);

async function ffprobeDurationMs(filePath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const sec = parseFloat(stdout.trim());
    if (Number.isFinite(sec)) return Math.round(sec * 1000);
  } catch {
    /* ignore */
  }
  return null;
}

export async function processVideoJob(
  type: "VIDEO_TRANSCODE" | "VIDEO_POSTER",
  payload: Record<string, unknown>
) {
  const mediaId = String(payload.mediaId || "");
  const media = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
  if (!media || media.type !== "VIDEO") return { skipped: true };

  const input = absPathForKey(media.storageKey);
  const durationMs = await ffprobeDurationMs(input);

  const posterKey = buildObjectKey({
    tenantId: media.tenantId,
    eventId: media.eventId,
    kind: "poster",
    filename: `${media.id}-poster.jpg`,
  });
  const posterAbs = absPathForKey(posterKey);
  await fs.mkdir(path.dirname(posterAbs), { recursive: true });

  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    input,
    "-ss",
    "00:00:01",
    "-vframes",
    "1",
    "-q:v",
    "3",
    posterAbs,
  ]);

  let previewKey: string | undefined;
  if (type === "VIDEO_TRANSCODE") {
    previewKey = buildObjectKey({
      tenantId: media.tenantId,
      eventId: media.eventId,
      kind: "preview",
      filename: `${media.id}-preview.mp4`,
    });
    const previewAbs = absPathForKey(previewKey);
    await fs.mkdir(path.dirname(previewAbs), { recursive: true });
    // Lightweight H.264 preview — keeps original untouched
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      input,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "28",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      "-vf",
      "scale='min(1280,iw)':-2",
      previewAbs,
    ]);
  }

  // Ensure poster is registered via putBuffer metadata path consistency
  const posterBuf = await fs.readFile(posterAbs);
  await putBuffer(posterKey, posterBuf, { overwrite: true });

  const event = await prisma.event.findUnique({ where: { id: media.eventId } });
  const nextStatus =
    media.status === "PROCESSING" || media.status === "UPLOADING"
      ? event?.requireApproval
        ? "PENDING_APPROVAL"
        : "APPROVED"
      : media.status;

  await prisma.mediaAsset.update({
    where: { id: media.id },
    data: {
      posterKey,
      thumbKey: posterKey,
      previewKey: previewKey || media.previewKey,
      durationMs: durationMs ?? media.durationMs,
      status: nextStatus,
    },
  });

  return { posterKey, previewKey, durationMs };
}
