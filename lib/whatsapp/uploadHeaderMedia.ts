import { createHash } from "node:crypto";

import { getWhatsAppProvider, type WhatsAppProvider } from "@/lib/whatsapp/provider";

/**
 * Uploads header bytes through the active WhatsApp provider and returns that
 * provider's media id.
 *
 * Template sends must not pass a Cloudinary (or other CDN) link. Meta fetches
 * a link once and can keep the result for the source Cache-Control max-age.
 * Cloudinary answers those fetches with
 * `public, no-transform, immutable, max-age=2592000`, so a bad preview stays
 * on phones for 30 days even after the file bytes change. Uploading the bytes
 * stores a new media object with the provider that will send the template.
 *
 * The bytes are not rewritten. Callers pass either the original file or the
 * already-required size conversion.
 *
 * A media id belongs to the provider account that uploaded it. A 360dialog id
 * is not valid after the sender switches to Bizuply, so the cache key includes
 * the provider and a fingerprint of its credentials. Meta expires uploaded ids
 * after 30 days. This cache expires one day earlier and drops an id as soon
 * as a send reports it invalid.
 */

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
  provider?: WhatsAppProvider;
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

function resolveProvider(deps: UploadDeps) {
  if (deps.provider) return deps.provider;
  return getWhatsAppProvider({ apiKey: deps.apiKey, fetch: deps.fetch });
}

function cacheKey(provider: WhatsAppProvider, bytes: Buffer, mime: string) {
  return createHash("sha256")
    .update(provider.id)
    .update("\0")
    .update(provider.accountKey)
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
  const provider = resolveProvider(deps);
  const now = deps.now ?? Date.now;
  const ttl = deps.ttlMs ?? WHATSAPP_HEADER_MEDIA_TTL_MS;
  const account = `${provider.id}:${provider.accountKey}`;
  const key = cacheKey(provider, input.bytes, input.mime);
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
  const pending = provider
    .uploadHeaderMedia({
      bytes: input.bytes,
      mime: input.mime,
      filename: input.mime === "image/png" ? "header.png" : "header.jpg",
    })
    .then((mediaId) => {
      entry.mediaId = mediaId;
      console.info("whatsapp header uploaded for template send", {
        provider: provider.id,
        mediaId,
        account: provider.accountKey.slice(0, 12),
        bytes: input.bytes.length,
        mime: input.mime,
        sourceUrl: input.context?.sourceUrl || "",
        normalized: Boolean(input.context?.normalized),
        contentType: input.context?.contentType || "",
        contentLength: input.context?.contentLength || "",
        contentDisposition: input.context?.contentDisposition || "",
        cacheControl: input.context?.cacheControl || "",
        etag: input.context?.etag || "",
        redirected: Boolean(input.context?.redirected),
        finalUrl: input.context?.finalUrl || "",
        structure: input.context?.structure || null,
      });
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
