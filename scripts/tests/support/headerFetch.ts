import sharp from "sharp";

let cached: Promise<Buffer> | null = null;

export function tinyHeaderJpeg() {
  cached ??= sharp({
    create: { width: 8, height: 8, channels: 3, background: "#224466" },
  })
    .jpeg({ quality: 80, progressive: false, mozjpeg: false })
    .toBuffer();
  return cached;
}

export const TEST_WHATSAPP_MEDIA_ID = "test-media-id";

/**
 * Serves a real JPEG for the header GET.
 * A media upload returns a stable id and is not treated as the message POST.
 */
export function fetchServingHeader(
  onPost: (url: string, init: any) => Promise<Response> | Response
) {
  return (async (url: any, init: any) => {
    const method = String(init?.method || "GET").toUpperCase();
    const target = String(url);
    if (method === "POST" && target.includes("/media")) {
      return new Response(JSON.stringify({ id: TEST_WHATSAPP_MEDIA_ID }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (method !== "POST") {
      const jpeg = await tinyHeaderJpeg();
      return new Response(jpeg, {
        status: 200,
        headers: {
          "content-type": "image/jpeg",
          "content-length": String(jpeg.length),
          "cache-control": "public, max-age=60",
        },
      });
    }
    return onPost(target, init);
  }) as typeof fetch;
}
