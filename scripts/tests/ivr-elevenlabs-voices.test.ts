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
    new ElevenLabsApiError("ELEVENLABS_UNAUTHORIZED", "denied", {
      providerStatus: 401,
      providerDetail: "Invalid API key",
      providerStatusCode: "invalid_api_key",
    })
  );
  assert.equal(payload.error, "ELEVENLABS_UNAUTHORIZED");
  assert.equal(payload.providerStatus, 401);
  assert.equal(payload.providerDetail, "Invalid API key");
  assert.equal(payload.providerStatusCode, "invalid_api_key");
  assert.equal(payload.authHeader, "xi-api-key");
  assert.match(payload.message, /401|Redeploy|מפתח/);
});

test("voiceErrorToClientPayload maps 402 insufficient_credits explicitly", () => {
  const payload = voiceErrorToClientPayload(
    new ElevenLabsApiError("ELEVENLABS_HTTP_402", "Payment required", {
      providerStatus: 402,
      providerDetail: "You have insufficient credits",
      providerStatusCode: "insufficient_credits",
    })
  );
  assert.equal(payload.error, "ELEVENLABS_INSUFFICIENT_CREDITS");
  assert.equal(payload.providerStatus, 402);
  assert.equal(payload.providerStatusCode, "insufficient_credits");
  assert.match(payload.providerDetail || "", /insufficient credits/i);
  assert.match(payload.message, /קרדיטים|insufficient_credits|402/);
  assert.doesNotMatch(payload.message, /^ELEVENLABS_HTTP_402$/);
});

test("voiceErrorToClientPayload maps Free+library-voice 402 as paid plan, not credits", () => {
  const payload = voiceErrorToClientPayload(
    new ElevenLabsApiError("ELEVENLABS_HTTP_402", "Payment required", {
      providerStatus: 402,
      providerDetail:
        "Free users cannot use library voices via the API. Please upgrade your subscription to use this voice",
      providerStatusCode: "payment_required",
    })
  );
  assert.equal(payload.error, "ELEVENLABS_LIBRARY_VOICE_REQUIRES_PAID");
  assert.match(payload.message, /Free plan|Voice Library|Paid plan|קרדיטים/);
  assert.match(payload.message, /לא חוסר קרדיטים|לא.*קרדיטים/);
});

test("voiceErrorToClientPayload maps bare 402 payment_required toward paid-voice", () => {
  const payload = voiceErrorToClientPayload(
    new ElevenLabsApiError("ELEVENLABS_HTTP_402", "denied", {
      providerStatus: 402,
      providerDetail: "Payment required",
      providerStatusCode: "payment_required",
    })
  );
  assert.equal(payload.error, "ELEVENLABS_LIBRARY_VOICE_REQUIRES_PAID");
  assert.match(payload.message, /Paid plan|ספרייה|Free plan|providerDetail/i);
});

test("normalizeSecretApiKey strips quotes whitespace and BOM", async () => {
  const { normalizeSecretApiKey } = await import("../../lib/calls/elevenlabs");
  assert.equal(normalizeSecretApiKey('  "sk_abc123"  '), "sk_abc123");
  assert.equal(normalizeSecretApiKey("sk_ab c\n123"), "sk_abc123");
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
    new Response(
      JSON.stringify({
        detail: {
          status: "invalid_api_key",
          message: "Invalid API key",
        },
      }),
      { status: 401 }
    )) as typeof fetch;

  try {
    await assert.rejects(
      () => listElevenLabsVoices(),
      (err: any) => {
        assert.equal(err?.code, "ELEVENLABS_UNAUTHORIZED");
        assert.equal(err?.providerStatus, 401);
        assert.match(String(err?.providerDetail || ""), /Invalid API key/i);
        assert.equal(err?.providerStatusCode, "invalid_api_key");
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = previous;
  }
});
