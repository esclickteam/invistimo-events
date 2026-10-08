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
import { ensureGlobalPackSegment } from "@/lib/calls/ivrSystemAudio";
import {
  buildIvrPublicAudioUrl,
  createIvrAudioPublicToken,
  ivrSystemR2Key,
  resolveIvrPublicAudioUrl,
  uploadIvrAudioToR2,
  verifyIvrAudioInR2,
  verifyIvrPublicAudioHttp,
} from "@/lib/calls/ivrAudioStorage";
import {
  assertVoiceIdIsDana,
  findExactDanaVoice,
  getIvrFemaleVoiceId,
  getIvrMaleVoiceId,
  getIvrTtsModelId,
  IVR_MALE_AUDITION_TEXT,
  IVR_REQUIRED_FEMALE_VOICE_NAME,
  listMaleAuditionCandidates,
  synthesizeElevenLabsSpeech,
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

export type PackSegmentStatus = {
  key: string;
  audioUrl: string;
  contentHash: string;
  ready: boolean;
  /** Why not ready / verification detail */
  status: "ready" | "missing" | "unplayable";
  reason?: string;
  sizeBytes?: number;
  contentType?: string;
  httpStatus?: number | null;
};

/**
 * Read-only: load existing pack segment audio from Mongo + verify R2 object.
 * Never synthesizes / never calls ElevenLabs.
 * ready=true only when R2 object exists with size > 0.
 */
async function readExistingPackSegments(
  gender: IvrVoiceGender,
  options?: { verifyHttp?: boolean }
): Promise<Record<IvrGlobalPackSegmentKey, PackSegmentStatus>> {
  const keys = (
    Object.keys(IVR_GLOBAL_PACK_TEXTS) as IvrGlobalPackSegmentKey[]
  ).map((segment) => globalPackAudioKey(gender, segment));

  let rows: any[] = [];
  try {
    rows = await IvrSystemAudio.find({ key: { $in: keys } })
      .select("key audioUrl contentHash publicToken r2Key contentType")
      .lean();
  } catch (err) {
    console.warn(
      "[ivrAdminVoicePacks] IvrSystemAudio read failed",
      err instanceof Error ? err.message : err
    );
    rows = [];
  }

  const byKey = new Map(rows.map((r) => [String(r.key), r]));
  const out = {} as Record<IvrGlobalPackSegmentKey, PackSegmentStatus>;

  await Promise.all(
    (Object.keys(IVR_GLOBAL_PACK_TEXTS) as IvrGlobalPackSegmentKey[]).map(
      async (segment) => {
        const key = globalPackAudioKey(gender, segment);
        const row = byKey.get(key);

        if (!row) {
          out[segment] = {
            key,
            audioUrl: "",
            contentHash: "",
            ready: false,
            status: "missing",
            reason: "NO_MONGO_ROW",
          };
          return;
        }

        const r2Key = String(row.r2Key || "").trim();
        if (!r2Key) {
          out[segment] = {
            key,
            audioUrl: "",
            contentHash: String(row.contentHash || ""),
            ready: false,
            status: "unplayable",
            reason: "MISSING_R2_KEY",
          };
          return;
        }

        const verified = await verifyIvrAudioInR2(r2Key);
        if (!verified.ok) {
          out[segment] = {
            key,
            audioUrl: "",
            contentHash: String(row.contentHash || ""),
            ready: false,
            status: "unplayable",
            reason: verified.reason || "R2_UNPLAYABLE",
            sizeBytes: verified.sizeBytes,
            contentType: verified.contentType,
          };
          return;
        }

        // Ensure a publicToken exists so media route + UI can play the clip.
        let publicToken = String(row.publicToken || "").trim();
        if (!publicToken) {
          publicToken = createIvrAudioPublicToken();
        }

        const audioUrl = resolveIvrPublicAudioUrl({
          publicToken,
          storedUrl: row.audioUrl,
        });

        // Refresh stale/missing token+URL in Mongo (best-effort, don't fail GET).
        if (
          audioUrl &&
          (audioUrl !== row.audioUrl || publicToken !== row.publicToken)
        ) {
          IvrSystemAudio.updateOne(
            { key },
            { $set: { audioUrl, publicToken } }
          ).catch(() => null);
        }

        let httpStatus: number | null | undefined;
        if (options?.verifyHttp && audioUrl) {
          const http = await verifyIvrPublicAudioHttp(audioUrl);
          httpStatus = http.status;
          if (!http.ok) {
            out[segment] = {
              key,
              audioUrl,
              contentHash: String(row.contentHash || ""),
              ready: false,
              status: "unplayable",
              reason: http.reason || "HTTP_UNPLAYABLE",
              sizeBytes: verified.sizeBytes,
              contentType: http.contentType || verified.contentType,
              httpStatus,
            };
            return;
          }
        }

        out[segment] = {
          key,
          audioUrl,
          contentHash: String(row.contentHash || ""),
          ready: Boolean(audioUrl),
          status: audioUrl ? "ready" : "unplayable",
          reason: audioUrl ? undefined : "MISSING_AUDIO_URL",
          sizeBytes: verified.sizeBytes,
          contentType: verified.contentType,
          httpStatus,
        };
      }
    )
  );

  return out;
}

function isTrustedFemaleLock(meta: IIvrPackVoiceMeta) {
  // Female must be explicitly locked to Dana (not a random auto voice).
  return (
    Boolean(meta.voiceId) &&
    (meta.adminNote === IVR_REQUIRED_FEMALE_VOICE_NAME ||
      meta.adminNote === "Dana")
  );
}

function isTrustedMaleLock(meta: IIvrPackVoiceMeta) {
  return (
    Boolean(meta.voiceId) && meta.adminNote === "admin_audition_locked"
  );
}

export async function getGlobalPacksApprovalStatus() {
  try {
    const doc = await getOrCreateConfigDoc();
    const female = normalizeMeta(doc.female, getIvrFemaleVoiceId());
    const male = normalizeMeta(doc.male, getIvrMaleVoiceId());
    // Wrong/auto packs stay unusable for clients even if approved flag is stale.
    const femaleApproved =
      packReady(female) && isTrustedFemaleLock(female);
    const maleApproved = packReady(male) && isTrustedMaleLock(male);
    return {
      femaleApproved,
      maleApproved,
      bothApproved: femaleApproved && maleApproved,
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
    // R2 HeadObject verification — Mongo URL alone is not enough for ready.
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
        status: audio?.status || "missing",
        reason: audio?.reason || "",
        sizeBytes: audio?.sizeBytes || 0,
        contentType: audio?.contentType || "",
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
      // segmentsReady reflects verified playable clips, not stale Mongo flags.
      segmentsReady: allReady,
      approved: Boolean(meta.approved) && allReady,
      approvedAt: meta.approvedAt || null,
      lastGeneratedAt: meta.lastGeneratedAt || null,
      readyCount,
      totalCount: segmentList.length,
      segments: segmentList,
    });
  }

  const status = await getGlobalPacksApprovalStatus();
  return {
    packs: packs.map((p) => {
      if (p.gender === "female" && p.approved && !isTrustedFemaleLock({
        voiceId: p.voiceId,
        adminNote: p.adminNote,
        source: "manual",
        segmentsReady: p.segmentsReady,
        approved: p.approved,
      })) {
        return { ...p, approved: false };
      }
      if (p.gender === "male" && p.approved && !isTrustedMaleLock({
        voiceId: p.voiceId,
        adminNote: p.adminNote,
        source: "manual",
        segmentsReady: p.segmentsReady,
        approved: p.approved,
      })) {
        return { ...p, approved: false };
      }
      return p;
    }),
    bothApproved: status.bothApproved,
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

  // Female is locked to exact Dana — reject any other voice id.
  if (gender === "female") {
    await assertVoiceIdIsDana(voiceId);
  }

  const doc = await getOrCreateConfigDoc();
  const prev = normalizeMeta(
    gender === "female" ? doc.female : doc.male,
    gender === "female" ? getIvrFemaleVoiceId() : getIvrMaleVoiceId()
  );
  const changed = prev.voiceId !== voiceId;

  const next = plainMeta({
    ...prev,
    voiceId,
    adminNote:
      gender === "female"
        ? IVR_REQUIRED_FEMALE_VOICE_NAME
        : String(input.adminNote ?? prev.adminNote ?? "").trim(),
    source: "manual",
    // Changing voice always invalidates pack audio / approval.
    segmentsReady: changed ? false : prev.segmentsReady,
    approved: false,
    approvedAt: null,
  });

  doc.set(gender, next);
  doc.markModified(gender);
  if (gender === "female") process.env.IVR_FEMALE_VOICE_ID = voiceId;
  else process.env.IVR_MALE_VOICE_ID = voiceId;

  await doc.save();

  if (changed) {
    await deletePackAudioForGender(gender);
  }

  return serializeAdminVoicePacks();
}

async function deletePackAudioForGender(gender: IvrVoiceGender) {
  const keys = (
    Object.keys(IVR_GLOBAL_PACK_TEXTS) as IvrGlobalPackSegmentKey[]
  ).map((segment) => globalPackAudioKey(gender, segment));
  await IvrSystemAudio.deleteMany({ key: { $in: keys } });
}

/**
 * Revoke both packs and delete their audio — wrong voices must not stay "ready".
 * Does NOT auto-regenerate. Admin must lock Dana + male, then generate once.
 */
export async function invalidateWrongVoicePacks() {
  const doc = await getOrCreateConfigDoc();

  // Clear wrong voice IDs entirely — do not leave auto-picked IDs usable.
  delete process.env.IVR_FEMALE_VOICE_ID;
  delete process.env.IVR_MALE_VOICE_ID;

  doc.set(
    "female",
    plainMeta({
      voiceId: "",
      adminNote: "revoked_wrong_voice",
      source: "manual",
      segmentsReady: false,
      approved: false,
      approvedAt: null,
      lastGeneratedAt: null,
    })
  );
  doc.set(
    "male",
    plainMeta({
      voiceId: "",
      adminNote: "revoked_wrong_voice",
      source: "manual",
      segmentsReady: false,
      approved: false,
      approvedAt: null,
      lastGeneratedAt: null,
    })
  );
  doc.markModified("female");
  doc.markModified("male");
  await doc.save();

  await deletePackAudioForGender("female");
  await deletePackAudioForGender("male");

  return {
    ...(await serializeAdminVoicePacks()),
    revoked: true,
    message:
      "ה-Voice Packs השגויים בוטלו והקבצים נמחקו. יש לנעול Dana + קול גברי מאושר ואז ליצור מחדש פעם אחת.",
  };
}

/** Resolve Dana from ElevenLabs account and lock as female voiceId. */
export async function lockFemaleVoiceToDana() {
  const dana = await findExactDanaVoice();
  process.env.IVR_FEMALE_VOICE_ID = dana.voiceId;
  const data = await updateAdminPackVoiceId({
    gender: "female",
    voiceId: dana.voiceId,
    adminNote: IVR_REQUIRED_FEMALE_VOICE_NAME,
  });
  return {
    ...data,
    dana: {
      voiceId: dana.voiceId,
      name: dana.name,
      category: dana.category,
    },
  };
}

/** Lock admin-chosen male voice after audition (no auto-pick). */
export async function lockMaleVoiceFromAudition(voiceId: string) {
  const id = String(voiceId || "").trim();
  if (!id) throw new Error("VOICE_ID_REQUIRED");
  process.env.IVR_MALE_VOICE_ID = id;
  return updateAdminPackVoiceId({
    gender: "male",
    voiceId: id,
    adminNote: "admin_audition_locked",
  });
}

/**
 * Build Hebrew audition clips for 2–3 male candidates (admin hearing test).
 * Uploads to R2 under ephemeral keys — not pack segments.
 */
export async function buildMaleVoiceAuditions(options?: {
  /** Optional model override for ear-test only — never auto-used for packs. */
  modelId?: string;
}) {
  const candidates = await listMaleAuditionCandidates(3);
  if (!candidates.length) {
    throw new Error("NO_MALE_VOICES_IN_ACCOUNT");
  }

  const modelId = String(options?.modelId || "").trim() || undefined;
  const auditions = [];
  for (const c of candidates) {
    const synth = await synthesizeElevenLabsSpeech({
      text: IVR_MALE_AUDITION_TEXT,
      voiceId: c.voiceId,
      modelId,
      // Only attached when modelSupportsLanguageCode(modelId) is true.
      languageCode: "he",
    });
    const token = createIvrAudioPublicToken();
    const keySuffix = modelId
      ? `audition:male:${modelId}:${c.voiceId}`
      : `audition:male:${c.voiceId}`;
    const r2Key = ivrSystemR2Key(keySuffix, token, "mp3");
    await uploadIvrAudioToR2({
      key: r2Key,
      buffer: synth.buffer,
      contentType: synth.contentType || "audio/mpeg",
    });
    // Store a short-lived lookup row so /api/ivr/media can serve it.
    await IvrSystemAudio.findOneAndUpdate(
      { key: keySuffix },
      {
        $set: {
          key: keySuffix,
          text: IVR_MALE_AUDITION_TEXT,
          voiceId: c.voiceId,
          audioUrl: buildIvrPublicAudioUrl(token),
          publicToken: token,
          r2Key,
          contentType: synth.contentType || "audio/mpeg",
          contentHash: synth.contentHash,
        },
      },
      { upsert: true }
    );
    auditions.push({
      voiceId: c.voiceId,
      name: c.name,
      category: c.category,
      labels: c.labels,
      modelId: modelId || getIvrTtsModelId(),
      audioUrl: buildIvrPublicAudioUrl(token),
      sampleText: IVR_MALE_AUDITION_TEXT,
    });
  }

  return {
    sampleText: IVR_MALE_AUDITION_TEXT,
    modelId: modelId || getIvrTtsModelId(),
    auditions,
  };
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

  if (gender === "female") {
    await assertVoiceIdIsDana(meta.voiceId);
    if (!isTrustedFemaleLock(meta)) {
      throw new Error("FEMALE_MUST_LOCK_DANA_FIRST");
    }
    process.env.IVR_FEMALE_VOICE_ID = meta.voiceId;
  } else {
    if (!isTrustedMaleLock(meta)) {
      throw new Error("MALE_MUST_LOCK_FROM_AUDITION_FIRST");
    }
    process.env.IVR_MALE_VOICE_ID = meta.voiceId;
  }

  const segmentKeys = Object.keys(
    IVR_GLOBAL_PACK_TEXTS
  ) as IvrGlobalPackSegmentKey[];

  // Check what already exists and is playable in R2 before any TTS.
  // After voice lock / invalidate, missing rows regenerate once.
  const existing = await readExistingPackSegments(gender);
  const reuseStats: Record<string, boolean> = {};
  const generatedSegments: string[] = [];

  for (const segment of segmentKeys) {
    const cur = existing[segment];
    if (!input.force && cur?.ready && cur.audioUrl) {
      reuseStats[segment] = true;
      continue;
    }

    if (input.force || cur?.status === "unplayable") {
      await IvrSystemAudio.deleteOne({
        key: globalPackAudioKey(gender, segment),
      });
    }

    const audio = await ensureGlobalPackSegment({ gender, segment });
    // Post-generate verification — never mark ready on upload failure.
    const verified = await verifyIvrAudioInR2(
      // ensure path stores r2Key on the doc; re-read status via pack helper below
      String(
        (
          await IvrSystemAudio.findOne({
            key: globalPackAudioKey(gender, segment),
          })
            .select("r2Key")
            .lean()
        )?.r2Key || ""
      )
    );
    if (!verified.ok || !audio.audioUrl) {
      throw new Error(
        `SEGMENT_VERIFY_FAILED:${segment}:${verified.reason || "no_url"}`
      );
    }

    reuseStats[segment] = Boolean(audio.reused);
    generatedSegments.push(segment);
  }

  // Final verified inventory via R2 HeadObject (size > 0). HTTP checked on approve.
  const after = await readExistingPackSegments(gender);
  const ready = segmentKeys.every((k) => after[k]?.ready);

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
      reuseStats,
      regeneratedSegments: generatedSegments,
      verifiedReady: ready,
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
  const row = await IvrSystemAudio.findOne({
    key: globalPackAudioKey(gender, segment),
  })
    .select("r2Key")
    .lean();
  const verified = await verifyIvrAudioInR2(String(row?.r2Key || ""));
  if (!verified.ok || !audio.audioUrl) {
    throw new Error(
      `SEGMENT_VERIFY_FAILED:${segment}:${verified.reason || "no_url"}`
    );
  }

  const http = await verifyIvrPublicAudioHttp(audio.audioUrl);
  if (!http.ok) {
    throw new Error(
      `SEGMENT_HTTP_VERIFY_FAILED:${segment}:${http.reason || http.status}`
    );
  }

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
      sizeBytes: verified.sizeBytes,
      contentType: http.contentType || verified.contentType,
      httpStatus: http.status,
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

  if (gender === "female") {
    await assertVoiceIdIsDana(meta.voiceId);
    if (!isTrustedFemaleLock(meta)) {
      throw new Error("FEMALE_MUST_LOCK_DANA_FIRST");
    }
  } else if (!isTrustedMaleLock(meta)) {
    throw new Error("MALE_MUST_LOCK_FROM_AUDITION_FIRST");
  }

  // Approve only when every segment is playable in R2 AND reachable over HTTPS.
  // Never auto-approve — this function runs only on explicit admin click.
  const existing = await readExistingPackSegments(gender, { verifyHttp: true });
  const notReady = (
    Object.keys(IVR_GLOBAL_PACK_TEXTS) as IvrGlobalPackSegmentKey[]
  ).filter((k) => !existing[k]?.ready);

  if (notReady.length) {
    throw new Error(
      `SEGMENTS_NOT_READY:${notReady
        .map((k) => `${k}:${existing[k]?.reason || "missing"}`)
        .join(",")}`
    );
  }

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
    if (female.voiceId && female.approved && isTrustedFemaleLock(female)) {
      process.env.IVR_FEMALE_VOICE_ID = female.voiceId;
    }
    if (male.voiceId && male.approved && isTrustedMaleLock(male)) {
      process.env.IVR_MALE_VOICE_ID = male.voiceId;
    }
  } catch (err) {
    console.warn(
      "[ivrAdminVoicePacks] hydrate failed",
      err instanceof Error ? err.message : err
    );
  }
}
