import { createHash } from "node:crypto";

/**
 * Uploads header bytes to 360dialog and returns a Meta media id.
 *
 * Template sends must not pass a Cloudinary (or other CDN) link.
 * 360dialog recommends media ids. A link is fetched by Meta and then reused
 * for the whole Cache-Control max-age. Cloudinary answers those fetches with
 * `public, no-transform, immutable, max-age=2592000`, so a bad preview stays
 * on phones for 30 days even after the file bytes change. Evently360 does not
 * send through that cache: Bizuply downloads the blob and Meta stores a new
 * media object. Uploading the same bytes here does the same thing.
 *
 * The bytes are not rewritten. Callers pass either the original file or the
 * already-required size conversion.
 *
 * A media id belongs to the WhatsApp channel (D360 API key) that uploaded it.
 * Meta expires uploaded ids after 30 days, so this cache does the same and
 * drops an id as soon as a send reports it invalid.
 */

const MEDIA_ENDPOINT = "https://waba-v2.360dialog.io/media";
const MAX_CACHE = 200;
/** Meta documents a 30-day media-id lifetime. Re-upload one day earlier. */
export const WHATSAPP_HEADER_MEDIA_TTL_MS = 29 * 24 * 60 * 60 * 1000;

type CacheEntry = {
  promise: Promise<string>;
  expiresAt: number;
  mediaId: string | null;
  account: string;
};

const mediaIds = new Map<string, CacheEntry>();

export type WhatsAppHeaderUploadContext = {
  sourceUrl?: string;
  normalized?: boolean;
  contentType?: string | null;
  contentLength?: string | null;
  contentDisposition?: string | null;
  cacheControl?: string | null;
  etag?: string | null;
  redirected?: boolean;
  finalUrl?: string;
  structure?: unknown;
};

type UploadDeps = {
  fetch?: typeof fetch;
  apiKey?: string;
  now?: () => number;
  ttlMs?: number;
};

export function clearWhatsAppHeaderMediaCache() {
  mediaIds.clear();
}

/** Drops a cached id so the next send uploads again on this channel. */
export function forgetWhatsAppHeaderMediaId(mediaId: string) {
  const target = String(mediaId || "").trim();
  if (!target) return;
  for (const [key, entry] of mediaIds) {
    if (entry.mediaId === target) mediaIds.delete(key);
  }
}

function accountFingerprint(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}

function cacheKey(account: string, bytes: Buffer, mime: string) {
  return createHash("sha256")
    .update(account)
    .update("\0")
    .update(mime)
    .update(bytes)
    .digest("hex");
}

export async function uploadWhatsAppHeaderMedia(
  input: {
    bytes: Buffer;
    mime: "image/jpeg" | "image/png";
    context?: WhatsAppHeaderUploadContext;
  },
  deps: UploadDeps = {}
) {
  const apiKey = String(deps.apiKey ?? process.env.WHATSAPP_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("Missing env var: WHATSAPP_API_KEY");
  }

  const now = deps.now ?? Date.now;
  const ttl = deps.ttlMs ?? WHATSAPP_HEADER_MEDIA_TTL_MS;
  const account = accountFingerprint(apiKey);
  const key = cacheKey(account, input.bytes, input.mime);
  const cached = mediaIds.get(key);
  if (cached && cached.account === account && cached.expiresAt > now()) {
    return cached.promise;
  }
  if (cached) mediaIds.delete(key);

  const entry: CacheEntry = {
    promise: Promise.resolve(""),
    expiresAt: now() + ttl,
    mediaId: null,
    account,
  };
  const pending = postHeaderMedia(input.bytes, input.mime, input.context, apiKey, deps.fetch)
    .then((mediaId) => {
      entry.mediaId = mediaId;
      return mediaId;
    })
    .catch((error) => {
      if (mediaIds.get(key) === entry) mediaIds.delete(key);
      throw error;
    });
  entry.promise = pending;
  mediaIds.set(key, entry);
  while (mediaIds.size > MAX_CACHE) {
    const oldest = mediaIds.keys().next().value;
    if (!oldest || oldest === key) break;
    mediaIds.delete(oldest);
  }
  return pending;
}

async function postHeaderMedia(
  bytes: Buffer,
  mime: "image/jpeg" | "image/png",
  context: WhatsAppHeaderUploadContext | undefined,
  apiKey: string,
  fetchImpl: typeof fetch | undefined
) {
  const filename = mime === "image/png" ? "header.png" : "header.jpg";
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new File([new Uint8Array(bytes)], filename, { type: mime }));

  const response = await (fetchImpl ?? fetch)(MEDIA_ENDPOINT, {
    method: "POST",
    headers: {
      "D360-API-KEY": apiKey,
    },
    body: form,
  });

  const text = await response.text().catch(() => "");
  let payload: { id?: unknown; error?: unknown } = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  const mediaId = String(payload.id ?? "").trim();
  if (!response.ok || payload.error || !mediaId) {
    console.error("whatsapp header media upload failed", {
      status: response.status,
      body: text.slice(0, 500),
    });
    throw new Error(`WhatsApp header media upload failed (${response.status})`);
  }

  console.info("whatsapp header uploaded for template send", {
    mediaId,
    account: accountFingerprint(apiKey).slice(0, 12),
    bytes: bytes.length,
    mime,
    sourceUrl: context?.sourceUrl || "",
    normalized: Boolean(context?.normalized),
    contentType: context?.contentType || "",
    contentLength: context?.contentLength || "",
    contentDisposition: context?.contentDisposition || "",
    cacheControl: context?.cacheControl || "",
    etag: context?.etag || "",
    redirected: Boolean(context?.redirected),
    finalUrl: context?.finalUrl || "",
    structure: context?.structure || null,
  });

  return mediaId;
}
