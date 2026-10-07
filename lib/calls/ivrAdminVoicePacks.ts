/**
 * Admin-only global Voice Pack management.
 * Creates fixed IVR segments once per gender; clients never regenerate them.
 */

import IvrSystemVoiceConfig, {
  type IIvrPackVoiceMeta,
} from "@/models/IvrSystemVoiceConfig";
import {
  IVR_GLOBAL_PACK_TEXTS,
  type IvrGlobalPackSegmentKey,
  type IvrVoiceGender,
  normalizeIvrVoiceGender,
} from "@/lib/calls/ivrScript";
import {
  ensureGlobalPackSegment,
  ensureGlobalVoicePack,
  type GlobalVoicePack,
} from "@/lib/calls/ivrSystemAudio";
import {
  getIvrFemaleVoiceId,
  getIvrMaleVoiceId,
} from "@/lib/calls/elevenlabs";

export const IVR_PACK_SEGMENT_LABELS: Record<
  IvrGlobalPackSegmentKey,
  string
> = {
  introBeforeEventName: "פתיח יוצא — לפני שם האירוע",
  introAfterEventName: "המשך יוצא — אחרי שם האירוע",
  inboundBeforeEventName: "פתיח נכנס/callback — לפני שם האירוע",
  inboundAfterEventName: "המשך נכנס/callback — אחרי שם האירוע",
  afterPress1: "אחרי הקשה 1 — בקשת מספר אורחים",
  afterValidQuantity: "אחרי כמות תקינה — אישור הגעה",
  afterPress2Or3: "אחרי הקשה 2 או 3",
  invalidInput: "קלט לא תקין (בחירה)",
  invalidGuestCount: "קלט לא תקין (כמות אורחים)",
  inboundAmbiguous: "נכנס — אירוע לא חד-משמעי",
  inboundNotFound: "נכנס — לא נמצאה הזמנה",
};

function emptyMeta(voiceId = ""): IIvrPackVoiceMeta {
  return {
    voiceId: String(voiceId || "").trim(),
    adminNote: "",
    source: voiceId ? "env" : "manual",
    segmentsReady: false,
    approved: false,
    approvedAt: null,
    lastGeneratedAt: null,
  };
}

async function getOrCreateConfigDoc() {
  let doc = await IvrSystemVoiceConfig.findOne({ key: "global" });
  if (!doc) {
    doc = await IvrSystemVoiceConfig.create({
      key: "global",
      female: emptyMeta(getIvrFemaleVoiceId()),
      male: emptyMeta(getIvrMaleVoiceId()),
    });
  }

  // Seed voice IDs from env if missing.
  let dirty = false;
  if (!doc.female?.voiceId && getIvrFemaleVoiceId()) {
    doc.female = { ...emptyMeta(getIvrFemaleVoiceId()), ...(doc.female || {}) };
    dirty = true;
  }
  if (!doc.male?.voiceId && getIvrMaleVoiceId()) {
    doc.male = { ...emptyMeta(getIvrMaleVoiceId()), ...(doc.male || {}) };
    dirty = true;
  }
  if (dirty) await doc.save();

  return doc;
}

function packReady(meta: IIvrPackVoiceMeta | null | undefined) {
  return Boolean(meta?.voiceId && meta?.segmentsReady && meta?.approved);
}

export async function getGlobalPacksApprovalStatus() {
  const doc = await getOrCreateConfigDoc();
  return {
    femaleApproved: packReady(doc.female),
    maleApproved: packReady(doc.male),
    bothApproved: packReady(doc.female) && packReady(doc.male),
  };
}

/** Client-facing genders only — no ElevenLabs names. Always both options. */
export function clientGenderChoices(_status?: {
  femaleApproved: boolean;
  maleApproved: boolean;
}) {
  return [
    { gender: "female" as IvrVoiceGender, label: "קול נשי" },
    { gender: "male" as IvrVoiceGender, label: "קול גברי" },
  ];
}

export async function serializeAdminVoicePacks() {
  const doc = await getOrCreateConfigDoc();
  const genders: IvrVoiceGender[] = ["female", "male"];
  const packs = [];

  for (const gender of genders) {
    const meta = (gender === "female" ? doc.female : doc.male) || emptyMeta();
    let segments: GlobalVoicePack["segments"] | null = null;
    if (meta.voiceId) {
      try {
        // Mirror env so ensureGlobalVoicePack uses the admin-configured id.
        if (gender === "female") {
          process.env.IVR_FEMALE_VOICE_ID = meta.voiceId;
        } else {
          process.env.IVR_MALE_VOICE_ID = meta.voiceId;
        }
        const pack = await ensureGlobalVoicePack(gender, { reuseOnly: true });
        segments = pack.segments;
      } catch {
        segments = null;
      }
    }

    const segmentList = (
      Object.keys(IVR_GLOBAL_PACK_TEXTS) as IvrGlobalPackSegmentKey[]
    ).map((key) => {
      const audio = segments?.[key];
      return {
        key,
        label: IVR_PACK_SEGMENT_LABELS[key],
        text: IVR_GLOBAL_PACK_TEXTS[key],
        audioUrl: audio?.audioUrl || "",
        ready: Boolean(audio?.audioUrl),
        reused: Boolean(audio?.reused),
        contentHash: audio?.contentHash || "",
      };
    });

    const readyCount = segmentList.filter((s) => s.ready).length;

    packs.push({
      gender,
      label: gender === "female" ? "קול נשי" : "קול גברי",
      voiceId: meta.voiceId || "",
      adminNote: meta.adminNote || "",
      segmentsReady: Boolean(meta.segmentsReady) || readyCount === segmentList.length,
      approved: Boolean(meta.approved),
      approvedAt: meta.approvedAt || null,
      lastGeneratedAt: meta.lastGeneratedAt || null,
      readyCount,
      totalCount: segmentList.length,
      segments: segmentList,
    });
  }

  return {
    packs,
    bothApproved: packs.every((p) => p.approved && p.segmentsReady && p.voiceId),
  };
}

export async function updateAdminPackVoiceId(input: {
  gender: IvrVoiceGender | string;
  voiceId: string;
  adminNote?: string;
}) {
  const gender = normalizeIvrVoiceGender(input.gender);
  if (!gender) throw new Error("INVALID_VOICE_GENDER");

  const voiceId = String(input.voiceId || "").trim();
  if (!voiceId) throw new Error("VOICE_ID_REQUIRED");

  const doc = await getOrCreateConfigDoc();
  const prev = (gender === "female" ? doc.female : doc.male) || emptyMeta();
  const changed = prev.voiceId !== voiceId;

  const next: IIvrPackVoiceMeta = {
    ...prev,
    voiceId,
    adminNote: String(input.adminNote ?? prev.adminNote ?? "").trim(),
    source: "manual",
    // Changing voice invalidates approval until regenerated.
    segmentsReady: changed ? false : prev.segmentsReady,
    approved: changed ? false : prev.approved,
    approvedAt: changed ? null : prev.approvedAt,
  };

  if (gender === "female") {
    doc.female = next;
    process.env.IVR_FEMALE_VOICE_ID = voiceId;
  } else {
    doc.male = next;
    process.env.IVR_MALE_VOICE_ID = voiceId;
  }

  await doc.save();
  return serializeAdminVoicePacks();
}

export async function generateAdminVoicePack(input: {
  gender: IvrVoiceGender | string;
  force?: boolean;
}) {
  const gender = normalizeIvrVoiceGender(input.gender);
  if (!gender) throw new Error("INVALID_VOICE_GENDER");

  const doc = await getOrCreateConfigDoc();
  const meta = (gender === "female" ? doc.female : doc.male) || emptyMeta();
  if (!meta.voiceId) throw new Error("VOICE_ID_REQUIRED");

  if (gender === "female") process.env.IVR_FEMALE_VOICE_ID = meta.voiceId;
  else process.env.IVR_MALE_VOICE_ID = meta.voiceId;

  // force: clear approval; ensureGlobalVoicePack regenerates when hash/voice changes.
  // To force regenerate a pack with same voiceId, delete is handled per-segment.
  const pack = await ensureGlobalVoicePack(gender, {
    reuseOnly: input.force ? false : false,
  });

  // If force, regenerate each segment by synthesizing with a forced path:
  // ensureCachedPromptAudio only re-TTS when hash mismatches. For true force,
  // call ensureGlobalPackSegment after temporarily busting via force flag below.
  if (input.force) {
    for (const segment of Object.keys(
      IVR_GLOBAL_PACK_TEXTS
    ) as IvrGlobalPackSegmentKey[]) {
      // synthesize by ensuring with reuseOnly false; hash matches → reuse.
      // True force: delete key first via model.
      const IvrSystemAudio = (await import("@/models/IvrSystemAudio")).default;
      const { globalPackAudioKey } = await import("@/lib/calls/ivrScript");
      await IvrSystemAudio.deleteOne({
        key: globalPackAudioKey(gender, segment),
      });
      await ensureGlobalPackSegment({ gender, segment });
    }
  }

  const refreshed = input.force
    ? await ensureGlobalVoicePack(gender)
    : pack;

  const ready = Object.values(refreshed.segments).every((s) => s.audioUrl);
  const next: IIvrPackVoiceMeta = {
    ...meta,
    segmentsReady: ready,
    approved: false,
    approvedAt: null,
    lastGeneratedAt: new Date(),
  };

  if (gender === "female") doc.female = next;
  else doc.male = next;
  await doc.save();

  return {
    ...(await serializeAdminVoicePacks()),
    generated: {
      gender,
      reuseStats: Object.fromEntries(
        Object.entries(refreshed.segments).map(([k, v]) => [k, v.reused])
      ),
    },
  };
}

export async function regenerateAdminPackSegment(input: {
  gender: IvrVoiceGender | string;
  segment: IvrGlobalPackSegmentKey | string;
}) {
  const gender = normalizeIvrVoiceGender(input.gender);
  if (!gender) throw new Error("INVALID_VOICE_GENDER");

  const segment = String(input.segment || "").trim() as IvrGlobalPackSegmentKey;
  if (!(segment in IVR_GLOBAL_PACK_TEXTS)) {
    throw new Error("INVALID_SEGMENT");
  }

  const doc = await getOrCreateConfigDoc();
  const meta = (gender === "female" ? doc.female : doc.male) || emptyMeta();
  if (!meta.voiceId) throw new Error("VOICE_ID_REQUIRED");

  if (gender === "female") process.env.IVR_FEMALE_VOICE_ID = meta.voiceId;
  else process.env.IVR_MALE_VOICE_ID = meta.voiceId;

  const IvrSystemAudio = (await import("@/models/IvrSystemAudio")).default;
  const { globalPackAudioKey } = await import("@/lib/calls/ivrScript");
  await IvrSystemAudio.deleteOne({
    key: globalPackAudioKey(gender, segment),
  });

  const audio = await ensureGlobalPackSegment({ gender, segment });

  // Regenerating any segment clears approval.
  const next: IIvrPackVoiceMeta = {
    ...meta,
    approved: false,
    approvedAt: null,
    lastGeneratedAt: new Date(),
  };
  if (gender === "female") doc.female = next;
  else doc.male = next;
  await doc.save();

  return {
    ...(await serializeAdminVoicePacks()),
    regenerated: {
      gender,
      segment,
      audioUrl: audio.audioUrl,
      reused: audio.reused,
    },
  };
}

export async function approveAdminVoicePack(input: {
  gender: IvrVoiceGender | string;
}) {
  const gender = normalizeIvrVoiceGender(input.gender);
  if (!gender) throw new Error("INVALID_VOICE_GENDER");

  const doc = await getOrCreateConfigDoc();
  const meta = (gender === "female" ? doc.female : doc.male) || emptyMeta();
  if (!meta.voiceId) throw new Error("VOICE_ID_REQUIRED");

  if (gender === "female") process.env.IVR_FEMALE_VOICE_ID = meta.voiceId;
  else process.env.IVR_MALE_VOICE_ID = meta.voiceId;

  // Verify all segments exist before approve.
  const pack = await ensureGlobalVoicePack(gender, { reuseOnly: true });
  const ready = Object.values(pack.segments).every((s) => s.audioUrl);
  if (!ready) throw new Error("SEGMENTS_NOT_READY");

  const next: IIvrPackVoiceMeta = {
    ...meta,
    segmentsReady: true,
    approved: true,
    approvedAt: new Date(),
  };
  if (gender === "female") doc.female = next;
  else doc.male = next;
  await doc.save();

  return serializeAdminVoicePacks();
}

/** Apply approved pack voice IDs into process env for runtime getters. */
export async function hydrateApprovedPackVoiceIds() {
  const doc = await getOrCreateConfigDoc();
  if (doc.female?.voiceId && doc.female.approved) {
    process.env.IVR_FEMALE_VOICE_ID = doc.female.voiceId;
  }
  if (doc.male?.voiceId && doc.male.approved) {
    process.env.IVR_MALE_VOICE_ID = doc.male.voiceId;
  }
}
