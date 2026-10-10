/**
 * Composed media must survive R2 Content-Type quirks and public GET must
 * expose clear errors + CORS for browser/Telnyx.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

test("octet-stream mp3 is accepted when magic bytes are valid", async () => {
  process.env.R2_BUCKET_NAME ||= "test-bucket";
  process.env.R2_ENDPOINT ||= "https://example.r2.cloudflarestorage.com";
  process.env.R2_ACCESS_KEY_ID ||= "test-key";
  process.env.R2_SECRET_ACCESS_KEY ||= "test-secret";
  const {
    looksLikePlayableAudioBuffer,
    resolvePlayableAudioContentType,
  } = await import("../../lib/calls/ivrAudioStorage");

  // Minimal ID3 + padding so length >= 64
  const id3 = Buffer.alloc(80, 0);
  id3[0] = 0x49;
  id3[1] = 0x44;
  id3[2] = 0x33;
  assert.equal(looksLikePlayableAudioBuffer(id3, "application/octet-stream"), true);
  assert.equal(looksLikePlayableAudioBuffer(id3, "audio/mpeg"), true);
  assert.equal(looksLikePlayableAudioBuffer(id3, "application/json"), false);
  assert.equal(resolvePlayableAudioContentType(id3, "application/octet-stream"), "audio/mpeg");

  const junk = Buffer.alloc(80, 0x20);
  assert.equal(looksLikePlayableAudioBuffer(junk, "audio/mpeg"), false);
});

test("media route resolves approval tokens and returns typed storage errors", () => {
  const media = readSrc("app/api/ivr/media/[token]/route.ts");
  assert.match(media, /recordingApproval\.audioPublicToken/);
  assert.match(media, /STORAGE_OBJECT_MISSING/);
  assert.match(media, /COMPOSED_R2_KEY_MISSING/);
  assert.match(media, /X-Ivr-Media-Error/);
  assert.match(media, /export async function OPTIONS/);
  assert.match(media, /resolvePlayableAudioContentType/);
  assert.match(media, /Access-Control-Allow-Origin/);
});

test("compose/recompose verify public media after save", () => {
  const config = readSrc("app/api/ivr/config/route.ts");
  assert.match(config, /assertSavedComposedMediaPublic/);
  assert.match(config, /COMPOSE_PUBLIC_MEDIA_UNREACHABLE/);
  assert.match(config, /verifyIvrPublicAudioHttp/);
  assert.match(config, /attachComposedMediaHealthLight/);
});

test("preview player does not force CORS crossOrigin on same-origin media", () => {
  const panel = readSrc("app/components/IvrRoundsPanel.jsx");
  const player = panel.slice(
    panel.indexOf("function ConcatPreviewPlayer"),
    panel.indexOf("function SingleClipPlayer")
  );
  assert.equal(player.includes("crossOrigin"), false);
  assert.match(player, /x-ivr-media-error/);
});
