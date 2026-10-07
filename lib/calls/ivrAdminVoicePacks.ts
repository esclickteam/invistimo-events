/**
 * Admin-only global Voice Pack management.
 * Creates fixed IVR segments once per gender; clients never regenerate them.
 * GET / serialize paths are read-only — never call ElevenLabs TTS.
 */

import IvrSystemVoiceConfig, {
  type IIvrPackVoiceMeta,
} from "@/models/IvrSystemVoiceConfig";
import IvrSystemAudio from "@/models/IvrSystemAudio";
import {
  globalPackAudioKey,
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

/** Normalize legacy Dana-resolve docs → pack meta (never throws). */
function normalizeMeta(raw: any, fallbackVoiceId = ""): IIvrPackVoiceMeta {
  const base = emptyMeta(fallbackVoiceId);
  if (!raw || typeof raw !== "object") return base;

  const voiceId = String(raw.voiceId || fallbackVoiceId || "").trim();
  const rawSource = String(raw.source || "").trim().toLowerCase();
  const source: IIvrPackVoiceMeta["source"] =
    rawSource === "env" || rawSource === "manual" || rawSource === "auto"
      ? (rawSource as IIvrPackVoiceMeta["source"])
      : voiceId
        ? "env"
        : "manual";

  return {
    voiceId,
    adminNote: String(raw.adminNote || "").trim(),
    source,
    segmentsReady: Boolean(raw.segmentsReady),
    approved: Boolean(raw.approved),
    approvedAt: raw.approvedAt ? new Date(raw.approvedAt) : null,
    lastGeneratedAt: raw.lastGeneratedAt ? new Date(raw.lastGeneratedAt) : null,
  };
}

function packReady(meta: IIvrPackVoiceMeta | null | undefined) {
  return Boolean(meta?.voiceId && meta?.segmentsReady && meta?.approved);
}

function plainMeta(meta: IIvrPackVoiceMeta): Record<string, unknown> {
  return {
    voiceId: meta.voiceId || "",
    adminNote: meta.adminNote || "",
    source: meta.source === "auto" ? "env" : meta.source || "manual",
    segmentsReady: Boolean(meta.segmentsReady),
    approved: Boolean(meta.approved),
    approvedAt: meta.approvedAt || null,
    lastGeneratedAt: meta.lastGeneratedAt || null,
  };
}

async function getOrCreateConfigDoc() {
  let doc = await IvrSystemVoiceConfig.findOne({ key: "global" });
  if (!doc) {
    try {
      doc = await IvrSystemVoiceConfig.create({
        key: "global",
        female: plainMeta(emptyMeta(getIvrFemaleVoiceId())),
        male: plainMeta(emptyMeta(getIvrMaleVoiceId())),
      });
    } catch (createErr: any) {
      // Race / legacy unique key — re-read.
      if (createErr?.code === 11000) {
        doc = await IvrSystemVoiceConfig.findOne({ key: "global" });
      }
      if (!doc) throw createErr;
    }
  }

  const female = normalizeMeta(doc.female, getIvrFemaleVoiceId());
  const male = normalizeMeta(doc.male, getIvrMaleVoiceId());

  // Seed missing voiceIds from env + migrate legacy shape so later saves validate.
  let dirty = false;
  if (!doc.female?.voiceId && female.voiceId) {
    dirty = true;
  }
  if (!doc.male?.voiceId && male.voiceId) {
    dirty = true;
  }
  // Legacy docs used source:"auto" / required name+label — rewrite to pack meta.
  const femaleRaw = doc.female as any;
  const maleRaw = doc.male as any;
  if (
    femaleRaw &&
    (femaleRaw.source === "auto" ||
      typeof femaleRaw.name === "string" ||
      typeof femaleRaw.label === "string" ||
      typeof femaleRaw.approved !== "boolean")
  ) {
    dirty = true;
  }
  if (
    maleRaw &&
    (maleRaw.source === "auto" ||
      typeof maleRaw.name === "string" ||
      typeof maleRaw.label === "string" ||
      typeof maleRaw.approved !== "boolean")
  ) {
    dirty = true;
  }

  if (dirty) {
    doc.set("female", plainMeta(female));
    doc.set("male", plainMeta(male));
    doc.markModified("female");
    doc.markModified("male");
    try {
      await doc.save();
    } catch (saveErr) {
      // GET must still work — log and continue with in-memory normalized meta.
      console.warn(
        "[ivrAdminVoicePacks] config migrate save failed",
        saveErr instanceof Error ? saveErr.message : saveErr
      );
    }
  }

  return doc;
}

/**
 * Read-only: load existing pack segment audio from Mongo.
 * Never synthesizes / never calls ElevenLabs.
 */
async function readExistingPackSegments(gender: IvrVoiceGender): Promise<
  Record<
    IvrGlobalPackSegmentKey,
    {
      key: string;
      audioUrl: string;
      contentHash: string;
      ready: boolean;
    }
  >
> {
  const keys = (
    Object.keys(IVR_GLOBAL_PACK_TEXTS) as IvrGlobalPackSegmentKey[]
  ).map((segment) => globalPackAudioKey(gender, segment));

  let rows: any[] = [];
  try {
    rows = await IvrSystemAudio.find({ key: { $in: keys } })
      .select("key audioUrl contentHash")
      .lean();
  } catch (err) {
    console.warn(
      "[ivrAdminVoicePacks] IvrSystemAudio read failed",
      err instanceof Error ? err.message : err
    );
    rows = [];
  }

  const byKey = new Map(rows.map((r) => [String(r.key), r]));
  const out = {} as Record<
    IvrGlobalPackSegmentKey,
    { key: string; audioUrl: string; contentHash: string; ready: boolean }
  >;

  for (const segment of Object.keys(
    IVR_GLOBAL_PACK_TEXTS
  ) as IvrGlobalPackSegmentKey[]) {
    const key = globalPackAudioKey(gender, segment);
    const row = byKey.get(key);
    const audioUrl = String(row?.audioUrl || "");
    out[segment] = {
      key,
      audioUrl,
      contentHash: String(row?.contentHash || ""),
      ready: Boolean(audioUrl),
    };
  }
  return out;
}

export async function getGlobalPacksApprovalStatus() {
  try {
    const doc = await getOrCreateConfigDoc();
    const female = normalizeMeta(doc.female, getIvrFemaleVoiceId());
    const male = normalizeMeta(doc.male, getIvrMaleVoiceId());
    return {
      femaleApproved: packReady(female),
      maleApproved: packReady(male),
      bothApproved: packReady(female) && packReady(male),
    };
  } catch (err) {
    console.warn(
      "[ivrAdminVoicePacks] approval status failed",
      err instanceof Error ? err.message : err
    );
    return {
      femaleApproved: false,
      maleApproved: false,
      bothApproved: false,
    };
  }
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

/**
 * Admin GET payload. Read-only: config + existing audio URLs.
 * Always returns both female and male packs — missing audio → ready:false.
 */
export async function serializeAdminVoicePacks() {
  let femaleMeta = emptyMeta(getIvrFemaleVoiceId());
  let maleMeta = emptyMeta(getIvrMaleVoiceId());

  try {
    const doc = await getOrCreateConfigDoc();
    femaleMeta = normalizeMeta(doc.female, getIvrFemaleVoiceId());
    maleMeta = normalizeMeta(doc.male, getIvrMaleVoiceId());
  } catch (err) {
    console.warn(
      "[ivrAdminVoicePacks] config read failed — using defaults",
      err instanceof Error ? err.message : err
    );
  }

  const genders: IvrVoiceGender[] = ["female", "male"];
  const packs = [];

  for (const gender of genders) {
    const meta = gender === "female" ? femaleMeta : maleMeta;
    const existing = await readExistingPackSegments(gender);

    const segmentList = (
      Object.keys(IVR_GLOBAL_PACK_TEXTS) as IvrGlobalPackSegmentKey[]
    ).map((key) => {
      const audio = existing[key];
      return {
        key,
        label: IVR_PACK_SEGMENT_LABELS[key],
        text: IVR_GLOBAL_PACK_TEXTS[key],
        audioUrl: audio?.audioUrl || "",
        ready: Boolean(audio?.ready),
        reused: Boolean(audio?.ready),
        contentHash: audio?.contentHash || "",
      };
    });

    const readyCount = segmentList.filter((s) => s.ready).length;
    const allReady = readyCount === segmentList.length && segmentList.length > 0;

    packs.push({
      gender,
      label: gender === "female" ? "קול נשי" : "קול גברי",
      voiceId: meta.voiceId || "",
      adminNote: meta.adminNote || "",
      segmentsReady: Boolean(meta.segmentsReady) || allReady,
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
  const prev = normalizeMeta(
    gender === "female" ? doc.female : doc.male,
    gender === "female" ? getIvrFemaleVoiceId() : getIvrMaleVoiceId()
  );
  const changed = prev.voiceId !== voiceId;

  const next = plainMeta({
    ...prev,
    voiceId,
    adminNote: String(input.adminNote ?? prev.adminNote ?? "").trim(),
    source: "manual",
    segmentsReady: changed ? false : prev.segmentsReady,
    approved: changed ? false : prev.approved,
    approvedAt: changed ? null : prev.approvedAt,
  });

  doc.set(gender, next);
  doc.markModified(gender);
  if (gender === "female") process.env.IVR_FEMALE_VOICE_ID = voiceId;
  else process.env.IVR_MALE_VOICE_ID = voiceId;

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
  const meta = normalizeMeta(
    gender === "female" ? doc.female : doc.male,
    gender === "female" ? getIvrFemaleVoiceId() : getIvrMaleVoiceId()
  );
  if (!meta.voiceId) throw new Error("VOICE_ID_REQUIRED");

  if (gender === "female") process.env.IVR_FEMALE_VOICE_ID = meta.voiceId;
  else process.env.IVR_MALE_VOICE_ID = meta.voiceId;

  let refreshed: GlobalVoicePack;

  if (input.force) {
    for (const segment of Object.keys(
      IVR_GLOBAL_PACK_TEXTS
    ) as IvrGlobalPackSegmentKey[]) {
      await IvrSystemAudio.deleteOne({
        key: globalPackAudioKey(gender, segment),
      });
      await ensureGlobalPackSegment({ gender, segment });
    }
    refreshed = await ensureGlobalVoicePack(gender);
  } else {
    refreshed = await ensureGlobalVoicePack(gender, { reuseOnly: false });
  }

  const ready = Object.values(refreshed.segments).every((s) => s.audioUrl);
  doc.set(
    gender,
    plainMeta({
      ...meta,
      segmentsReady: ready,
      approved: false,
      approvedAt: null,
      lastGeneratedAt: new Date(),
    })
  );
  doc.markModified(gender);
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
  const meta = normalizeMeta(
    gender === "female" ? doc.female : doc.male,
    gender === "female" ? getIvrFemaleVoiceId() : getIvrMaleVoiceId()
  );
  if (!meta.voiceId) throw new Error("VOICE_ID_REQUIRED");

  if (gender === "female") process.env.IVR_FEMALE_VOICE_ID = meta.voiceId;
  else process.env.IVR_MALE_VOICE_ID = meta.voiceId;

  await IvrSystemAudio.deleteOne({
    key: globalPackAudioKey(gender, segment),
  });

  const audio = await ensureGlobalPackSegment({ gender, segment });

  doc.set(
    gender,
    plainMeta({
      ...meta,
      approved: false,
      approvedAt: null,
      lastGeneratedAt: new Date(),
    })
  );
  doc.markModified(gender);
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
  const meta = normalizeMeta(
    gender === "female" ? doc.female : doc.male,
    gender === "female" ? getIvrFemaleVoiceId() : getIvrMaleVoiceId()
  );
  if (!meta.voiceId) throw new Error("VOICE_ID_REQUIRED");

  const existing = await readExistingPackSegments(gender);
  const ready = Object.values(existing).every((s) => s.ready);
  if (!ready) throw new Error("SEGMENTS_NOT_READY");

  doc.set(
    gender,
    plainMeta({
      ...meta,
      segmentsReady: true,
      approved: true,
      approvedAt: new Date(),
    })
  );
  doc.markModified(gender);
  await doc.save();

  return serializeAdminVoicePacks();
}

/** Apply approved pack voice IDs into process env for runtime getters. */
export async function hydrateApprovedPackVoiceIds() {
  try {
    const doc = await getOrCreateConfigDoc();
    const female = normalizeMeta(doc.female);
    const male = normalizeMeta(doc.male);
    if (female.voiceId && female.approved) {
      process.env.IVR_FEMALE_VOICE_ID = female.voiceId;
    }
    if (male.voiceId && male.approved) {
      process.env.IVR_MALE_VOICE_ID = male.voiceId;
    }
  } catch (err) {
    console.warn(
      "[ivrAdminVoicePacks] hydrate failed",
      err instanceof Error ? err.message : err
    );
  }
}
