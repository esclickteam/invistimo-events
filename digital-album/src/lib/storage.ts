import { createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { env } from "./env";

export type StoragePutResult = {
  key: string;
  absPath: string;
  sizeBytes: number;
  checksumSha256: string;
};

function root() {
  return path.resolve(process.cwd(), env.storageRoot);
}

export function absPathForKey(key: string) {
  const abs = path.resolve(root(), key);
  if (!abs.startsWith(root())) {
    throw new Error("Invalid storage key");
  }
  return abs;
}

export async function ensureStorageDirs() {
  for (const d of ["uploads", "thumbs", "videos", "posters", "selfies", "tmp", "zips"]) {
    await fs.mkdir(path.join(root(), d), { recursive: true });
  }
}

export async function putBuffer(
  key: string,
  data: Buffer,
  opts?: { overwrite?: boolean }
): Promise<StoragePutResult> {
  await ensureStorageDirs();
  const abs = absPathForKey(key);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  if (!opts?.overwrite) {
    try {
      await fs.access(abs);
      throw new Error("Object already exists");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT" && (e as Error).message !== "Object already exists") {
        /* continue if not exists */
      }
      if ((e as Error).message === "Object already exists") throw e;
    }
  }
  await fs.writeFile(abs, data);
  const checksumSha256 = createHash("sha256").update(data).digest("hex");
  return { key, absPath: abs, sizeBytes: data.length, checksumSha256 };
}

export async function appendChunk(key: string, chunk: Buffer, offset: number) {
  await ensureStorageDirs();
  const abs = absPathForKey(key);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const fh = await fs.open(abs, "a+");
  try {
    const stat = await fh.stat();
    if (stat.size !== offset) {
      throw new Error(`Offset mismatch: expected ${stat.size}, got ${offset}`);
    }
    await fh.write(chunk, 0, chunk.length, offset);
  } finally {
    await fh.close();
  }
  const buf = await fs.readFile(abs);
  return {
    sizeBytes: buf.length,
    checksumSha256: createHash("sha256").update(buf).digest("hex"),
  };
}

export async function readBuffer(key: string) {
  return fs.readFile(absPathForKey(key));
}

export async function deleteObject(key: string) {
  try {
    await fs.unlink(absPathForKey(key));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}

export async function objectExists(key: string) {
  try {
    await fs.access(absPathForKey(key));
    return true;
  } catch {
    return false;
  }
}

export function buildObjectKey(parts: {
  tenantId: string;
  eventId: string;
  kind: "original" | "thumb" | "preview" | "poster" | "selfie" | "greeting" | "tmp";
  filename: string;
}) {
  const safe = parts.filename.replace(/[^a-zA-Z0-9._\-\u0590-\u05FF]/g, "_");
  const id = randomBytes(8).toString("hex");
  const folder =
    parts.kind === "thumb"
      ? "thumbs"
      : parts.kind === "poster"
        ? "posters"
        : parts.kind === "selfie"
          ? "selfies"
          : parts.kind === "tmp"
            ? "tmp"
            : parts.kind === "preview"
              ? "videos"
              : "uploads";
  return `${folder}/${parts.tenantId}/${parts.eventId}/${id}-${safe}`;
}

/** Short-lived signed URL for private media (local/dev compatible). */
export function signMediaUrl(key: string, ttlSeconds = 600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${key}:${exp}`;
  const sig = createHmac("sha256", env.storageSignedSecret)
    .update(payload)
    .digest("hex");
  return `/api/media/file?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
}

export function verifyMediaSignature(key: string, exp: number, sig: string) {
  if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
  const payload = `${key}:${exp}`;
  const expected = createHmac("sha256", env.storageSignedSecret)
    .update(payload)
    .digest("hex");
  if (expected.length !== sig.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}
