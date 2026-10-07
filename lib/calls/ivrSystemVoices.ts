/**
 * Resolve and cache the two Invistimo system voices:
 * - Female: Dana when usable on this plan; else free-API-compatible female
 * - Male: best natural Hebrew male usable on this plan; else free premade
 *
 * Important (Free plan): Voice Library voices return HTTP 402 via API even when
 * credits remain. We probe TTS before locking a voice ID.
 */

import IvrSystemVoiceConfig, {
  type IIvrResolvedVoice,
} from "@/models/IvrSystemVoiceConfig";
import {
  ElevenLabsApiError,
  ELEVENLABS_FREE_PREMADE,
  getIvrFemaleVoiceId as getEnvFemaleVoiceId,
  getIvrMaleVoiceId as getEnvMaleVoiceId,
  listElevenLabsVoices,
  probeElevenLabsTts,
  type ElevenLabsVoice,
} from "@/lib/calls/elevenlabs";

export type IvrSystemVoiceChoice = {
  gender: "female" | "male";
  voiceId: string;
  name: string;
  /** Client-facing Hebrew label */
  label: string;
  apiCompatible?: boolean;
  category?: string | null;
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

/** Premade / cloned / generated in My Voices — more likely Free-API compatible. */
function isLikelyApiFreeCompatible(voice: ElevenLabsVoice): boolean {
  const category = String(voice.category || "")
    .trim()
    .toLowerCase();
  if (!category || category === "premade" || category === "cloned") return true;
  if (category === "generated" || category === "professional") return true;
  // Explicit library / high_quality community voices are blocked on Free API.
  if (category === "high_quality" || category === "library") return false;
  return category !== "famous";
}

function scoreMaleHebrewIvr(voice: ElevenLabsVoice): number {
  let score = 0;
  if (isHebrewVoice(voice)) score += 50;
  if (isMaleVoice(voice)) score += 40;
  else return -1000;
  if (isLikelyApiFreeCompatible(voice)) score += 30;
  else score -= 40;

  const labels = labelsOf(voice);
  const useCase = `${labels.use_case || ""} ${labels.descriptive || ""}`;
  const name = voice.name.toLowerCase();
  const blob = `${name} ${useCase} ${JSON.stringify(voice.labels || {})}`;

  if (/narrat|news|broadcast|ivr|announce|calm|warm|clear|mature|natural/.test(blob)) {
    score += 25;
  }
  if (/middle.?aged|old|mature/.test(blob)) score += 10;
  if (/young|child|teen|cartoon|character|anime/.test(blob)) score -= 20;
  if (/hebrew|עברית|\bhe\b/.test(blob)) score += 15;
  if (voice.category && voice.category !== "premade") score += 5;

  return score;
}

function findDanaVoice(voices: ElevenLabsVoice[]): ElevenLabsVoice | null {
  const exact = voices.find(
    (v) => v.name.trim().toLowerCase() === "dana" && isFemaleVoice(v)
  );
  if (exact) return exact;

  const hebrewDana = voices.find(
    (v) => /\bdana\b/i.test(v.name) && isFemaleVoice(v) && isHebrewVoice(v)
  );
  if (hebrewDana) return hebrewDana;

  return (
    voices.find((v) => /\bdana\b/i.test(v.name) && isFemaleVoice(v)) || null
  );
}

function findBestHebrewMale(voices: ElevenLabsVoice[]): ElevenLabsVoice | null {
  const scored = voices
    .map((voice) => ({ voice, score: scoreMaleHebrewIvr(voice) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored[0]) return scored[0].voice;

  const maleHe = voices.filter((v) => isMaleVoice(v) && isHebrewVoice(v));
  if (maleHe[0]) return maleHe[0];

  const anyMale = voices.filter(
    (v) => isMaleVoice(v) && isLikelyApiFreeCompatible(v)
  );
  return anyMale[0] || null;
}

async function searchSharedVoices(input: {
  search?: string;
  gender?: "male" | "female";
  language?: string;
}): Promise<ElevenLabsVoice[]> {
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
  source: IIvrResolvedVoice["source"],
  extra?: { apiCompatible?: boolean; category?: string | null }
): IvrSystemVoiceChoice {
  if (gender === "female") {
    const isDana = /\bdana\b/i.test(name || "");
    return {
      gender: "female",
      voiceId,
      name: name || "Dana",
      label: isDana ? "דנה – קול נשי" : `${name || "Female"} – קול נשי`,
      apiCompatible: extra?.apiCompatible,
      category: extra?.category ?? null,
    };
  }
  const display = name ? `${name} – קול גברי` : "קול גברי";
  return {
    gender: "male",
    voiceId,
    name: name || "Male",
    label: display,
    apiCompatible: extra?.apiCompatible,
    category: extra?.category ?? null,
  };
}

function choiceFromResolved(
  gender: "female" | "male",
  resolved?: IIvrResolvedVoice | null
): IvrSystemVoiceChoice | null {
  if (!resolved?.voiceId) return null;
  return toChoice(gender, resolved.voiceId, resolved.name, resolved.source);
}

function applyMemoryCache(
  female: IvrSystemVoiceChoice | null,
  male: IvrSystemVoiceChoice | null
) {
  memoryCache = { female, male, loadedAt: Date.now() };
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

async function acceptIfTtsWorks(
  voice: ElevenLabsVoice,
  gender: "female" | "male"
): Promise<IvrSystemVoiceChoice | null> {
  const probe = await probeElevenLabsTts({
    voiceId: voice.voice_id,
    text: "בדיקה",
  });
  if (!probe.ok) {
    console.warn("[ivrSystemVoices] TTS probe rejected voice", {
      name: voice.name,
      voiceId: voice.voice_id,
      category: voice.category,
      httpStatus: probe.httpStatus,
      providerStatusCode: probe.providerStatusCode,
      providerDetail: probe.providerDetail,
      errorCode: probe.errorCode,
    });
    return null;
  }
  return toChoice(gender, voice.voice_id, voice.name, "auto", {
    apiCompatible: true,
    category: voice.category || null,
  });
}

/**
 * Returns the two client-facing voice choices.
 * Never returns the full ElevenLabs catalog.
 */
export async function getIvrSystemVoiceChoices(options?: {
  forceResolve?: boolean;
  /** Re-probe and replace Mongo cache (e.g. after plan change). */
  revalidate?: boolean;
}): Promise<{
  voices: IvrSystemVoiceChoice[];
  resolved: boolean;
  diagnostics: {
    femaleSource: string | null;
    maleSource: string | null;
    femaleName: string | null;
    maleName: string | null;
    femaleProbe?: string | null;
    maleProbe?: string | null;
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

  let femaleProbe: string | null = null;
  let maleProbe: string | null = null;

  if (
    !options?.forceResolve &&
    !options?.revalidate &&
    memoryCache?.female &&
    memoryCache?.male
  ) {
    return {
      voices: [memoryCache.female, memoryCache.male].filter(
        Boolean
      ) as IvrSystemVoiceChoice[],
      resolved: true,
      diagnostics: {
        femaleSource: "memory",
        maleSource: "memory",
        femaleName: memoryCache.female?.name || null,
        maleName: memoryCache.male?.name || null,
      },
    };
  }

  if ((!female || !male) && !options?.revalidate) {
    const fromDb = await loadFromMongo();
    female = female || fromDb.female;
    male = male || fromDb.male;
  }

  if (
    ((!female || !male) || options?.revalidate) &&
    options?.forceResolve !== false
  ) {
    try {
      const accountVoices = await listElevenLabsVoices();

      if (!female || options?.revalidate) {
        const danaAccount = findDanaVoice(accountVoices);
        if (danaAccount) {
          const accepted = await acceptIfTtsWorks(danaAccount, "female");
          if (accepted) {
            female = accepted;
            femaleProbe = "dana_account_ok";
          } else {
            femaleProbe = "dana_account_402_or_failed";
          }
        }

        // Shared library Dana — often 402 on Free; probe before accepting.
        if (!female) {
          const shared = await searchSharedVoices({
            search: "Dana",
            gender: "female",
            language: "he",
          });
          const danaShared = findDanaVoice(shared);
          if (danaShared) {
            const accepted = await acceptIfTtsWorks(danaShared, "female");
            if (accepted) {
              female = accepted;
              femaleProbe = "dana_library_ok";
            } else {
              femaleProbe = "dana_library_blocked_use_premade_fallback";
            }
          }
        }

        if (!female) {
          // Free-API safe fallback (Rachel premade). Label is honest — not Dana.
          const rachel = accountVoices.find(
            (v) => v.voice_id === ELEVENLABS_FREE_PREMADE.rachel
          ) || {
            voice_id: ELEVENLABS_FREE_PREMADE.rachel,
            name: "Rachel",
            category: "premade",
            labels: { gender: "female" },
          };
          const accepted = await acceptIfTtsWorks(rachel as ElevenLabsVoice, "female");
          if (accepted) {
            female = {
              ...accepted,
              label: "Rachel – קול נשי (Free API)",
            };
            femaleProbe = femaleProbe || "fallback_rachel_premade";
          }
        }
      }

      if (!male || options?.revalidate) {
        const ranked = [...accountVoices]
          .map((voice) => ({ voice, score: scoreMaleHebrewIvr(voice) }))
          .filter((row) => row.score > 0)
          .sort((a, b) => b.score - a.score);

        for (const row of ranked.slice(0, 8)) {
          const accepted = await acceptIfTtsWorks(row.voice, "male");
          if (accepted) {
            male = accepted;
            maleProbe = `account_male_ok:${row.voice.name}`;
            break;
          }
        }

        if (!male) {
          const sharedMales = await searchSharedVoices({
            gender: "male",
            language: "he",
          });
          const bestShared = findBestHebrewMale(sharedMales);
          if (bestShared) {
            const accepted = await acceptIfTtsWorks(bestShared, "male");
            if (accepted) {
              male = accepted;
              maleProbe = `library_male_ok:${bestShared.name}`;
            } else {
              maleProbe = "library_male_blocked_use_premade_fallback";
            }
          }
        }

        if (!male) {
          const adam = {
            voice_id: ELEVENLABS_FREE_PREMADE.adam,
            name: "Adam",
            category: "premade",
            labels: { gender: "male" },
          } as ElevenLabsVoice;
          const accepted = await acceptIfTtsWorks(adam, "male");
          if (accepted) {
            male = accepted;
            maleProbe = maleProbe || "fallback_adam_premade";
          }
        }
      }

      if (female || male) {
        await saveToMongo({
          female,
          male,
          notes: `Resolved with TTS probe female=${femaleProbe || "n/a"} male=${maleProbe || "n/a"}`,
        });
      }
    } catch (error) {
      if (
        error instanceof ElevenLabsApiError &&
        (error.code === "ELEVENLABS_API_KEY_MISSING" ||
          error.code === "ELEVENLABS_UNAUTHORIZED" ||
          error.code === "ELEVENLABS_INSUFFICIENT_CREDITS" ||
          error.code === "ELEVENLABS_PAYMENT_REQUIRED" ||
          error.code === "ELEVENLABS_LIBRARY_VOICE_REQUIRES_PAID")
      ) {
        // keep partial
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
      femaleProbe,
      maleProbe,
    },
  };
}

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
