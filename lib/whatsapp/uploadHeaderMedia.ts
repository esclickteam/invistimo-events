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
 */

const MEDIA_ENDPOINT = "https://waba-v2.360dialog.io/media";
const MAX_CACHE = 200;

const mediaIds = new Map<string, Promise<string>>();

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
};

export function clearWhatsAppHeaderMediaCache() {
  mediaIds.clear();
}

function cacheKey(bytes: Buffer, mime: string) {
  return createHash("sha256").update(mime).update(bytes).digest("hex");
}

export async function uploadWhatsAppHeaderMedia(
  input: {
    bytes: Buffer;
    mime: "image/jpeg" | "image/png";
    context?: WhatsAppHeaderUploadContext;
  },
  deps: UploadDeps = {}
) {
  const key = cacheKey(input.bytes, input.mime);
  const cached = mediaIds.get(key);
  if (cached) return cached;

  const pending = postHeaderMedia(input.bytes, input.mime, input.context, deps).catch(
    (error) => {
      mediaIds.delete(key);
      throw error;
    }
  );
  mediaIds.set(key, pending);
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
  deps: UploadDeps
) {
  const apiKey = String(deps.apiKey ?? process.env.WHATSAPP_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("Missing env var: WHATSAPP_API_KEY");
  }

  const filename = mime === "image/png" ? "header.png" : "header.jpg";
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mime }), filename);

  const fetchImpl = deps.fetch ?? fetch;
  const response = await fetchImpl(MEDIA_ENDPOINT, {
    method: "POST",
    headers: {
      "D360-API-KEY": apiKey,
    },
    body: form,
  });

  const text = await response.text().catch(() => "");
  let payload: { id?: unknown } = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  const mediaId = String(payload.id ?? "").trim();
  if (!response.ok || !mediaId) {
    console.error("whatsapp header media upload failed", {
      status: response.status,
      body: text.slice(0, 500),
    });
    throw new Error(
      `WhatsApp header media upload failed (${response.status})`
    );
  }

  console.info("whatsapp header uploaded for template send", {
    mediaId,
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
