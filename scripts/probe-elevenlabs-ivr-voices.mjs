#!/usr/bin/env node
/**
 * Direct ElevenLabs TTS probe for IVR voice selection.
 * Compares Dana / male / free premade baseline — prints HTTP status + full provider detail.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... node scripts/probe-elevenlabs-ivr-voices.mjs
 *   IVR_FEMALE_VOICE_ID=... IVR_MALE_VOICE_ID=... node scripts/probe-elevenlabs-ivr-voices.mjs
 */

const BASE =
  (process.env.ELEVENLABS_API_BASE || "https://api.elevenlabs.io").replace(
    /\/$/,
    ""
  );

function normalizeKey(raw) {
  let key = String(raw || "");
  key = key.replace(/^\uFEFF/, "").replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
  key = key.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key.replace(/\s+/g, "");
}

const API_KEY = normalizeKey(
  process.env.ELEVENLABS_API_KEY ||
    process.env.ELEVEN_LABS_API_KEY ||
    process.env.XI_API_KEY
);

const FREE_PREMADE = {
  rachel: "21m00Tcm4TlvDq8ikWAM",
  adam: "pNInz6obpgDQGcFmaJgB",
};

async function elFetch(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "xi-api-key": API_KEY,
      Accept: "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  return res;
}

async function listVoices() {
  const res = await elFetch("/v2/voices?page_size=100");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // fallback v1
    const res1 = await elFetch("/v1/voices?show_legacy=true");
    const data1 = await res1.json().catch(() => ({}));
    if (!res1.ok) {
      throw new Error(
        `voices failed ${res.status}/${res1.status}: ${JSON.stringify(data1).slice(0, 300)}`
      );
    }
    return Array.isArray(data1.voices) ? data1.voices : [];
  }
  return Array.isArray(data.voices) ? data.voices : [];
}

async function searchShared(search, gender, language) {
  const params = new URLSearchParams({ page_size: "20" });
  if (search) params.set("search", search);
  if (gender) params.set("gender", gender);
  if (language) params.set("language", language);
  const res = await elFetch(`/v1/shared-voices?${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  return Array.isArray(data.voices) ? data.voices : [];
}

function summarizeVoice(v) {
  if (!v) return null;
  return {
    voice_id: v.voice_id,
    name: v.name,
    category: v.category || null,
    labels: v.labels || {},
    language: v.language || v.labels?.language || null,
    gender: v.gender || v.labels?.gender || null,
  };
}

async function probeTts(voiceId, label) {
  const res = await elFetch(`/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: "בדיקה",
      model_id: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
      voice_settings: { stability: 0.45, similarity_boost: 0.75 },
    }),
  });

  const bodyText = await res.text().catch(() => "");
  let parsed = null;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    parsed = null;
  }

  const detail = parsed?.detail;
  const providerStatusCode =
    typeof detail === "object" && detail
      ? detail.status || detail.code || null
      : null;
  const providerDetail =
    typeof detail === "string"
      ? detail
      : typeof detail === "object" && detail
        ? detail.message || JSON.stringify(detail)
        : bodyText && !res.ok
          ? bodyText.slice(0, 400)
          : null;

  return {
    label,
    voiceId,
    httpStatus: res.status,
    ok: res.ok,
    bytes: res.ok ? Buffer.byteLength(bodyText, "binary") : 0,
    providerStatusCode,
    providerDetail,
    rawDetail: detail || null,
  };
}

function isHebrewish(v) {
  const blob = JSON.stringify(v || {}).toLowerCase();
  return /\bhe\b|hebrew|עברית/.test(blob);
}

function isMale(v) {
  const g = String(v?.gender || v?.labels?.gender || "").toLowerCase();
  return g === "male" || g === "man";
}

async function main() {
  if (!API_KEY) {
    console.error("ELEVENLABS_API_KEY missing");
    process.exit(2);
  }

  console.log("=== ElevenLabs IVR voice probe ===");
  console.log("keyLength:", API_KEY.length, "prefix:", API_KEY.slice(0, 3));

  const accountVoices = await listVoices();
  console.log("accountVoices:", accountVoices.length);

  const danaAccount = accountVoices.find(
    (v) => String(v.name || "").trim().toLowerCase() === "dana"
  );
  const danaShared = danaAccount
    ? null
    : (await searchShared("Dana", "female", "he"))[0] ||
      (await searchShared("Dana", "female", null))[0] ||
      null;

  const maleCandidates = [
    ...accountVoices.filter((v) => isMale(v) && isHebrewish(v)),
    ...accountVoices.filter((v) => isMale(v)),
  ];
  const sharedMales = await searchShared("", "male", "he");
  const malePick =
    maleCandidates[0] ||
    sharedMales.find((v) => isHebrewish(v)) ||
    sharedMales[0] ||
    null;

  const femaleId =
    process.env.IVR_FEMALE_VOICE_ID ||
    danaAccount?.voice_id ||
    danaShared?.voice_id ||
    "";
  const maleId =
    process.env.IVR_MALE_VOICE_ID || malePick?.voice_id || FREE_PREMADE.adam;

  console.log("\n--- resolved candidates ---");
  console.log(
    "Dana (account):",
    JSON.stringify(summarizeVoice(danaAccount), null, 2)
  );
  console.log(
    "Dana (shared library):",
    JSON.stringify(summarizeVoice(danaShared), null, 2)
  );
  console.log(
    "Male pick:",
    JSON.stringify(summarizeVoice(malePick), null, 2)
  );
  console.log("femaleId:", femaleId);
  console.log("maleId:", maleId);

  const probes = [];
  if (femaleId) {
    probes.push(await probeTts(femaleId, "Dana / female candidate"));
  } else {
    probes.push({
      label: "Dana / female candidate",
      voiceId: "",
      httpStatus: 0,
      ok: false,
      providerDetail: "Dana voice_id not found in account or shared search",
      providerStatusCode: null,
    });
  }
  probes.push(await probeTts(maleId, "Male candidate"));
  probes.push(await probeTts(FREE_PREMADE.rachel, "Free premade Rachel"));
  probes.push(await probeTts(FREE_PREMADE.adam, "Free premade Adam"));

  console.log("\n--- TTS results ---");
  for (const p of probes) {
    console.log(
      JSON.stringify(
        {
          label: p.label,
          voiceId: p.voiceId,
          httpStatus: p.httpStatus,
          ok: p.ok,
          providerStatusCode: p.providerStatusCode,
          providerDetail: p.providerDetail,
          rawDetail: p.rawDetail,
          bytes: p.bytes,
        },
        null,
        2
      )
    );
  }

  const dana = probes[0];
  const male = probes[1];
  const rachel = probes[2];
  const adam = probes[3];

  console.log("\n--- verdict ---");
  if (
    !dana.ok &&
    dana.httpStatus === 402 &&
    /library|upgrade your subscription|paid/i.test(
      `${dana.providerDetail} ${dana.providerStatusCode}`
    )
  ) {
    console.log(
      "VERDICT: Dana/female 402 is Voice Library / paid-plan restriction — NOT insufficient_credits."
    );
  } else if (!dana.ok && dana.httpStatus === 402) {
    console.log(
      "VERDICT: Dana/female returned 402. Full providerDetail above — compare to Free premade."
    );
  } else if (dana.ok) {
    console.log("VERDICT: Dana/female TTS works on this key/plan.");
  }

  if (rachel.ok && !dana.ok) {
    console.log(
      "Free premade Rachel returned 200 while Dana failed → plan/voice-type issue, not credits."
    );
  }
  if (adam.ok && !male.ok) {
    console.log(
      "Free premade Adam returned 200 while male candidate failed → male pick is likely Voice Library restricted on Free."
    );
  }
  if (rachel.ok && adam.ok && dana.ok && male.ok) {
    console.log("All probed voices returned 200.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
