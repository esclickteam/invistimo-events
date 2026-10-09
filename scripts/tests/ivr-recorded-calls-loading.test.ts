/**
 * Recorded-calls screen must never hang on media/R2 checks during GET config.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../.."
);

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

test("GET /api/ivr/config does not await R2 or public media HTTP", () => {
  const config = readSrc("app/api/ivr/config/route.ts");
  assert.match(config, /attachComposedMediaHealthLight/);
  const getFn = config.slice(
    config.indexOf("export async function GET"),
    config.indexOf("export async function PATCH")
  );
  assert.match(getFn, /attachComposedMediaHealthLight/);
  assert.equal(getFn.includes("attachComposedMediaHealth("), false);
  assert.equal(getFn.includes("verifyIvrAudioInR2"), false);
  assert.equal(getFn.includes("verifyIvrPublicAudioHttp"), false);
  assert.match(config, /Never await R2\/HTTP on GET/);
});

test("panel always exits loading and offers retry", () => {
  const panel = readSrc("app/components/IvrRoundsPanel.jsx");
  const load = panel.slice(
    panel.indexOf("async function loadAll"),
    panel.indexOf("useEffect(() => {\n    loadAll()")
  );
  assert.match(load, /AbortController|abort\(/);
  assert.match(load, /finally/);
  assert.match(load, /setLoading\(false\)/);
  assert.match(load, /12000/);
  assert.match(panel, /ivr-rounds-retry/);
  assert.match(panel, /ivr-rounds-load-error/);
  assert.match(panel, /ivr-rounds-loading/);
});

test("write-path media health stays timed and optional", () => {
  const storage = readSrc("lib/calls/ivrAudioStorage.ts");
  assert.match(storage, /timeoutMs/);
  assert.match(storage, /R2_HEAD_TIMEOUT/);
  assert.match(storage, /AbortSignal\.timeout/);
  const config = readSrc("app/api/ivr/config/route.ts");
  assert.match(config, /timeoutMs: 2500/);
});
