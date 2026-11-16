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

/** Serves a real JPEG for the header GET, and forwards the 360dialog POST. */
export function fetchServingHeader(
  onPost: (url: string, init: any) => Promise<Response> | Response
) {
  return (async (url: any, init: any) => {
    const method = String(init?.method || "GET").toUpperCase();
    if (method !== "POST") {
      const jpeg = await tinyHeaderJpeg();
      return new Response(jpeg, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    }
    return onPost(String(url), init);
  }) as typeof fetch;
}
