import assert from "node:assert/strict";
import test from "node:test";
import {
  ElevenLabsApiError,
  listElevenLabsVoices,
  sanitizeElevenLabsErrorMessage,
  voiceErrorToClientPayload,
} from "../../lib/calls/elevenlabs";

test("voiceErrorToClientPayload maps unauthorized clearly", () => {
  const payload = voiceErrorToClientPayload(
    new ElevenLabsApiError("ELEVENLABS_UNAUTHORIZED", "denied", 401)
  );
  assert.equal(payload.error, "ELEVENLABS_UNAUTHORIZED");
  assert.equal(payload.providerStatus, 401);
  assert.match(payload.message, /401/);
});

test("sanitize still redacts key material", () => {
  const previous = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = "sk_test_secret_value_123456";
  try {
    const sanitized = sanitizeElevenLabsErrorMessage(
      "boom sk_test_secret_value_123456 xi-api-key=sk_test_secret_value_123456"
    );
    assert.equal(sanitized.includes("sk_test_secret_value_123456"), false);
  } finally {
    if (previous === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previous;
  }
});

test("listElevenLabsVoices prefers v2 and returns named voices", async () => {
  const previous = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = "sk_test_dummy_key_for_unit";

  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: any) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/v2/voices")) {
      return new Response(
        JSON.stringify({
          voices: [
            {
              voice_id: "abc123",
              name: "Hebrew Female",
              labels: { language: "he" },
            },
          ],
          has_more: false,
          next_page_token: null,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    throw new Error(`Unexpected fetch ${url}`);
  }) as typeof fetch;

  try {
    const voices = await listElevenLabsVoices();
    assert.equal(voices.length, 1);
    assert.equal(voices[0].voice_id, "abc123");
    assert.equal(voices[0].name, "Hebrew Female");
    assert.ok(calls.some((url) => url.includes("/v2/voices")));
    assert.ok(!calls.some((url) => url.includes("/v1/voices")));
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previous;
  }
});

test("listElevenLabsVoices falls back to v1 when v2 fails non-auth", async () => {
  const previous = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = "sk_test_dummy_key_for_unit";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any) => {
    const url = String(input);
    if (url.includes("/v2/voices")) {
      return new Response(JSON.stringify({ detail: "gone" }), { status: 404 });
    }
    if (url.includes("/v1/voices")) {
      return new Response(
        JSON.stringify({
          voices: [{ voice_id: "legacy1", name: "Legacy Voice" }],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
    throw new Error(`Unexpected fetch ${url}`);
  }) as typeof fetch;

  try {
    const voices = await listElevenLabsVoices();
    assert.equal(voices[0].name, "Legacy Voice");
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previous;
  }
});

test("listElevenLabsVoices surfaces 401 without fallback", async () => {
  const previous = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = "sk_test_dummy_key_for_unit";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ detail: "invalid api key" }), {
      status: 401,
    })) as typeof fetch;

  try {
    await assert.rejects(
      () => listElevenLabsVoices(),
      (err: any) => {
        assert.equal(err?.code, "ELEVENLABS_UNAUTHORIZED");
        assert.equal(err?.providerStatus, 401);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previous;
  }
});
