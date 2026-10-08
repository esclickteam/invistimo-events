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
  createIvrAudioPublicToken,
  resolveIvrPublicAudioUrl,
  verifyIvrAudioInR2,
  verifyIvrPublicAudioHttp,
} from "@/lib/calls/ivrAudioStorage";
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

  const segmentKeys = Object.keys(
    IVR_GLOBAL_PACK_TEXTS
  ) as IvrGlobalPackSegmentKey[];

  // Check what already exists and is playable in R2 before any TTS.
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

  // Approve only when every segment is playable in R2 AND reachable over HTTPS.
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
