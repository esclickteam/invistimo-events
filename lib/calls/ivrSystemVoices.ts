/**
 * Resolve and cache the two Invistimo system voices:
 * - Female: Dana (Hebrew)
 * - Male: best natural Hebrew male for IVR narration
 *
 * Clients never see the ElevenLabs catalog — only these two choices.
 */

import IvrSystemVoiceConfig, {
  type IIvrResolvedVoice,
} from "@/models/IvrSystemVoiceConfig";
import {
  ElevenLabsApiError,
  getIvrFemaleVoiceId as getEnvFemaleVoiceId,
  getIvrMaleVoiceId as getEnvMaleVoiceId,
  listElevenLabsVoices,
  type ElevenLabsVoice,
} from "@/lib/calls/elevenlabs";

export type IvrSystemVoiceChoice = {
  gender: "female" | "male";
  voiceId: string;
  name: string;
  /** Client-facing Hebrew label */
  label: string;
};

type CacheState = {
  female: IvrSystemVoiceChoice | null;
  male: IvrSystemVoiceChoice | null;
  loadedAt: number;
};

let memoryCache: CacheState | null = null;

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function labelsOf(voice: ElevenLabsVoice): Record<string, string> {
  const labels = voice.labels || {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(labels)) {
    out[String(k).toLowerCase()] = String(v || "")
      .trim()
      .toLowerCase();
  }
  return out;
}

function voiceLanguage(voice: ElevenLabsVoice): string {
  const labels = labelsOf(voice);
  return (
    labels.language ||
    labels.accent ||
    String((voice as any).language || "")
      .trim()
      .toLowerCase()
  );
}

function isHebrewVoice(voice: ElevenLabsVoice): boolean {
  const lang = voiceLanguage(voice);
  if (lang === "he" || lang === "hebrew" || lang.startsWith("he-")) return true;
  const verified = Array.isArray((voice as any).verified_languages)
    ? (voice as any).verified_languages
    : [];
  if (
    verified.some((item: any) => {
      const l = String(item?.language || "")
        .trim()
        .toLowerCase();
      return l === "he" || l === "hebrew" || l.startsWith("he-");
    })
  ) {
    return true;
  }
  const blob = `${voice.name} ${JSON.stringify(voice.labels || {})}`.toLowerCase();
  return /\bhe\b|hebrew|עברית/.test(blob);
}

function isMaleVoice(voice: ElevenLabsVoice): boolean {
  const gender = labelsOf(voice).gender || "";
  return gender === "male" || gender === "man" || gender === "masculine";
}

function isFemaleVoice(voice: ElevenLabsVoice): boolean {
  const gender = labelsOf(voice).gender || "";
  return (
    gender === "female" || gender === "woman" || gender === "feminine" || !gender
  );
}

function scoreMaleHebrewIvr(voice: ElevenLabsVoice): number {
  let score = 0;
  if (isHebrewVoice(voice)) score += 50;
  if (isMaleVoice(voice)) score += 40;
  else return -1000;

  const labels = labelsOf(voice);
  const useCase = `${labels.use_case || ""} ${labels.descriptive || ""} ${
    labels.description || ""
  }`;
  const name = voice.name.toLowerCase();
  const blob = `${name} ${useCase} ${JSON.stringify(voice.labels || {})}`;

  if (/narrat|news|broadcast|ivr|announce|calm|warm|clear|mature|natural/.test(blob)) {
    score += 25;
  }
  if (/middle.?aged|old|mature/.test(blob)) score += 10;
  if (/young|child|teen|cartoon|character|anime/.test(blob)) score -= 20;
  if (/hebrew|עברית|\bhe\b/.test(blob)) score += 15;

  // Prefer voices already in the account (not empty category quirks).
  if (voice.category && voice.category !== "premade") score += 5;

  return score;
}

function findDanaVoice(voices: ElevenLabsVoice[]): ElevenLabsVoice | null {
  const exact = voices.find(
    (v) => v.name.trim().toLowerCase() === "dana" && isFemaleVoice(v)
  );
  if (exact) return exact;

  const hebrewDana = voices.find(
    (v) =>
      /\bdana\b/i.test(v.name) && isFemaleVoice(v) && isHebrewVoice(v)
  );
  if (hebrewDana) return hebrewDana;

  const anyDana = voices.find(
    (v) => /\bdana\b/i.test(v.name) && isFemaleVoice(v)
  );
  return anyDana || null;
}

function findBestHebrewMale(voices: ElevenLabsVoice[]): ElevenLabsVoice | null {
  const scored = voices
    .map((voice) => ({ voice, score: scoreMaleHebrewIvr(voice) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored[0]) return scored[0].voice;

  // Fallback: any male with Hebrew hint
  const maleHe = voices.filter((v) => isMaleVoice(v) && isHebrewVoice(v));
  if (maleHe[0]) return maleHe[0];

  const anyMale = voices.filter((v) => isMaleVoice(v));
  return anyMale[0] || null;
}

async function searchSharedVoices(input: {
  search?: string;
  gender?: "male" | "female";
  language?: string;
}): Promise<ElevenLabsVoice[]> {
  // Optional shared-library search — never exposed to clients.
  try {
    const params = new URLSearchParams({ page_size: "30" });
    if (input.search) params.set("search", input.search);
    if (input.gender) params.set("gender", input.gender);
    if (input.language) params.set("language", input.language);

    const base =
      readEnv("ELEVENLABS_API_BASE").trim() || "https://api.elevenlabs.io";
    const key =
      readEnv("ELEVENLABS_API_KEY") ||
      readEnv("ELEVEN_LABS_API_KEY") ||
      readEnv("XI_API_KEY");
    if (!key) return [];

    const res = await fetch(`${base}/v1/shared-voices?${params.toString()}`, {
      headers: { "xi-api-key": key.trim(), Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    const batch = Array.isArray(data?.voices) ? data.voices : [];
    return batch
      .map((raw: any) => {
        const voice_id = String(raw?.voice_id || "").trim();
        const name = String(raw?.name || "").trim();
        if (!voice_id || !name) return null;
        return {
          voice_id,
          name,
          preview_url: raw?.preview_url || null,
          labels: {
            ...(raw?.labels || {}),
            gender: String(
              raw?.gender || raw?.labels?.gender || ""
            ).toLowerCase(),
            language: String(
              raw?.language || raw?.labels?.language || ""
            ).toLowerCase(),
          },
          category: raw?.category || "library",
        } as ElevenLabsVoice;
      })
      .filter(Boolean) as ElevenLabsVoice[];
  } catch {
    return [];
  }
}

function toChoice(
  gender: "female" | "male",
  voiceId: string,
  name: string,
  source: IIvrResolvedVoice["source"]
): IvrSystemVoiceChoice {
  if (gender === "female") {
    return {
      gender: "female",
      voiceId,
      name: name || "Dana",
      label: "דנה – קול נשי",
    };
  }
  const display = name ? `${name} – קול גברי` : "קול גברי";
  return {
    gender: "male",
    voiceId,
    name: name || "Male",
    label: display,
  };
}

function choiceFromResolved(
  gender: "female" | "male",
  resolved?: IIvrResolvedVoice | null
): IvrSystemVoiceChoice | null {
  if (!resolved?.voiceId) return null;
  return toChoice(gender, resolved.voiceId, resolved.name, resolved.source);
}

function applyMemoryCache(female: IvrSystemVoiceChoice | null, male: IvrSystemVoiceChoice | null) {
  memoryCache = { female, male, loadedAt: Date.now() };
  // Keep sync getters in elevenlabs.ts working via process env mirror for this process.
  if (female?.voiceId && !getEnvFemaleVoiceId()) {
    process.env.IVR_FEMALE_VOICE_ID = female.voiceId;
  }
  if (male?.voiceId && !getEnvMaleVoiceId()) {
    process.env.IVR_MALE_VOICE_ID = male.voiceId;
  }
}

async function loadFromMongo(): Promise<{
  female: IvrSystemVoiceChoice | null;
  male: IvrSystemVoiceChoice | null;
}> {
  try {
    const doc = await IvrSystemVoiceConfig.findOne({ key: "global" }).lean();
    return {
      female: choiceFromResolved("female", doc?.female),
      male: choiceFromResolved("male", doc?.male),
    };
  } catch {
    return { female: null, male: null };
  }
}

async function saveToMongo(input: {
  female: IvrSystemVoiceChoice | null;
  male: IvrSystemVoiceChoice | null;
  notes?: string;
}) {
  const female: IIvrResolvedVoice | null = input.female
    ? {
        voiceId: input.female.voiceId,
        name: input.female.name,
        label: input.female.label,
        gender: "female",
        language: "he",
        source: getEnvFemaleVoiceId() ? "env" : "auto",
      }
    : null;
  const male: IIvrResolvedVoice | null = input.male
    ? {
        voiceId: input.male.voiceId,
        name: input.male.name,
        label: input.male.label,
        gender: "male",
        language: "he",
        source: getEnvMaleVoiceId() ? "env" : "auto",
      }
    : null;

  await IvrSystemVoiceConfig.findOneAndUpdate(
    { key: "global" },
    {
      $set: {
        key: "global",
        female,
        male,
        resolvedAt: new Date(),
        notes: input.notes || "",
      },
    },
    { upsert: true, new: true }
  );
}

/**
 * Returns the two client-facing voice choices.
 * Never returns the full ElevenLabs catalog.
 */
export async function getIvrSystemVoiceChoices(options?: {
  forceResolve?: boolean;
}): Promise<{
  voices: IvrSystemVoiceChoice[];
  resolved: boolean;
  diagnostics: {
    femaleSource: string | null;
    maleSource: string | null;
    femaleName: string | null;
    maleName: string | null;
  };
}> {
  const envFemaleId = getEnvFemaleVoiceId();
  const envMaleId = getEnvMaleVoiceId();

  let female: IvrSystemVoiceChoice | null = envFemaleId
    ? toChoice("female", envFemaleId, "Dana", "env")
    : null;
  let male: IvrSystemVoiceChoice | null = envMaleId
    ? toChoice("male", envMaleId, readEnv("IVR_MALE_VOICE_NAME") || "", "env")
    : null;

  if (!options?.forceResolve && memoryCache?.female && memoryCache?.male) {
    return {
      voices: [memoryCache.female, memoryCache.male].filter(Boolean) as IvrSystemVoiceChoice[],
      resolved: true,
      diagnostics: {
        femaleSource: "memory",
        maleSource: "memory",
        femaleName: memoryCache.female?.name || null,
        maleName: memoryCache.male?.name || null,
      },
    };
  }

  if (!female || !male) {
    const fromDb = await loadFromMongo();
    female = female || fromDb.female;
    male = male || fromDb.male;
  }

  if ((!female || !male) && options?.forceResolve !== false) {
    // Discover missing voices from the account / shared library (server-side only).
    try {
      const accountVoices = await listElevenLabsVoices();
      if (!female) {
        let dana = findDanaVoice(accountVoices);
        if (!dana) {
          const shared = await searchSharedVoices({
            search: "Dana",
            gender: "female",
            language: "he",
          });
          dana = findDanaVoice(shared) || findDanaVoice(accountVoices);
        }
        if (dana) {
          female = toChoice("female", dana.voice_id, dana.name, "auto");
        }
      }
      if (!male) {
        let best = findBestHebrewMale(accountVoices);
        if (!best) {
          const sharedMales = await searchSharedVoices({
            gender: "male",
            language: "he",
          });
          best = findBestHebrewMale(sharedMales);
        }
        if (best) {
          male = toChoice("male", best.voice_id, best.name, "auto");
        }
      }

      if (female || male) {
        await saveToMongo({
          female,
          male,
          notes: "Auto-resolved Dana (female) + best Hebrew male for IVR",
        });
      }
    } catch (error) {
      // Surface later via voices/config diagnostics — keep partial env/db results.
      if (
        error instanceof ElevenLabsApiError &&
        (error.code === "ELEVENLABS_API_KEY_MISSING" ||
          error.code === "ELEVENLABS_UNAUTHORIZED" ||
          error.code === "ELEVENLABS_INSUFFICIENT_CREDITS" ||
          error.code === "ELEVENLABS_PAYMENT_REQUIRED")
      ) {
        // still return whatever we have
      } else {
        console.warn(
          "[ivrSystemVoices] resolve failed",
          error instanceof Error ? error.message : "unknown"
        );
      }
    }
  }

  applyMemoryCache(female, male);

  const voices = [female, male].filter(Boolean) as IvrSystemVoiceChoice[];
  return {
    voices,
    resolved: Boolean(female && male),
    diagnostics: {
      femaleSource: female ? (envFemaleId ? "env" : "resolved") : null,
      maleSource: male ? (envMaleId ? "env" : "resolved") : null,
      femaleName: female?.name || null,
      maleName: male?.name || null,
    },
  };
}

/** Sync-friendly accessors after getIvrSystemVoiceChoices() has run. */
export function getCachedIvrFemaleVoiceId(): string {
  return memoryCache?.female?.voiceId || getEnvFemaleVoiceId() || "";
}

export function getCachedIvrMaleVoiceId(): string {
  return memoryCache?.male?.voiceId || getEnvMaleVoiceId() || "";
}

export function getCachedIvrVoiceIdForGender(
  gender: "female" | "male" | string | null | undefined
): string {
  const g = String(gender || "")
    .trim()
    .toLowerCase();
  if (g === "male") return getCachedIvrMaleVoiceId();
  if (g === "female") return getCachedIvrFemaleVoiceId();
  return getCachedIvrFemaleVoiceId() || getCachedIvrMaleVoiceId();
}
