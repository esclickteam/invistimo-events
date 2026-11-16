import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { appendChunk } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";

export async function PUT(req: Request) {
  try {
    const ip = clientIp(req);
    const rl = rateLimit(`upload-chunk:${ip}`, 300, 60_000);
    if (!rl.ok) return jsonError("יותר מדי מקטעים", 429);

    const uploadId = req.headers.get("x-upload-id");
    const uploadToken = req.headers.get("x-upload-token");
    const offsetHeader = req.headers.get("x-upload-offset");
    if (!uploadId || !uploadToken || offsetHeader == null) {
      return jsonError("חסרים כותרות העלאה", 400);
    }
    const offset = Number(offsetHeader);
    if (!Number.isFinite(offset) || offset < 0) return jsonError("offset לא תקין", 400);

    const session = await prisma.uploadSession.findUnique({ where: { id: uploadId } });
    if (!session || session.status !== "active") return jsonError("העלאה לא פעילה", 404);
    if (session.expiresAt < new Date()) return jsonError("פג תוקף ההעלאה", 410);

    const tokenHash = createHash("sha256").update(uploadToken).digest("hex");
    if (tokenHash !== session.uploadToken) return jsonError("טוקן לא תקין", 401);

    const media = session.mediaId
      ? await prisma.mediaAsset.findUnique({ where: { id: session.mediaId } })
      : null;
    if (!media) return jsonError("מדיה לא נמצאה", 404);

    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length === 0) return jsonError("מקטע ריק", 400);

    const result = await appendChunk(media.storageKey, buf, offset);
    await prisma.uploadSession.update({
      where: { id: session.id },
      data: { receivedBytes: BigInt(result.sizeBytes) },
    });

    return jsonOk({
      receivedBytes: result.sizeBytes,
      complete: BigInt(result.sizeBytes) >= session.totalBytes,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
