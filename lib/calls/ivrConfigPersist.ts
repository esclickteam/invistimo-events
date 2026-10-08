/**
 * Safe writes for User.ivrConfig.
 * Mongoose throws "Cast to Object failed for value undefined" when a nested
 * audio subdoc is assigned undefined. Always persist plain objects.
 */

export type IvrAudioSubdoc = Record<string, unknown>;

export function plainIvrConfig(cfg: any): Record<string, unknown> {
  if (!cfg) return {};
  if (typeof cfg.toObject === "function") {
    try {
      return cfg.toObject({ depopulate: true }) || {};
    } catch {
      /* fall through */
    }
  }
  return { ...cfg };
}

export function normalizeIvrAudioSubdoc(raw: unknown): IvrAudioSubdoc {
  if (!raw || typeof raw !== "object") {
    return { status: "missing", approved: false };
  }
  const src =
    typeof (raw as any).toObject === "function"
      ? (raw as any).toObject()
      : (raw as Record<string, unknown>);
  const out: IvrAudioSubdoc = {};
  for (const [key, value] of Object.entries(src || {})) {
    if (value !== undefined) out[key] = value;
  }
  if (!out.status) out.status = "missing";
  if (typeof out.approved !== "boolean") out.approved = false;
  return out;
}

export function emptyRecordingApproval(): Record<string, unknown> {
  return {
    approved: false,
    approvedAt: null,
    audioMode: null,
    voiceGender: null,
    audioPublicToken: "",
    audioContentHash: "",
    audioUrl: "",
  };
}

export function normalizeRecordingApproval(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return emptyRecordingApproval();
  const src =
    typeof (raw as any).toObject === "function"
      ? (raw as any).toObject()
      : (raw as Record<string, unknown>);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(src || {})) {
    if (value !== undefined) out[key] = value;
  }
  if (typeof out.approved !== "boolean") out.approved = false;
  return out;
}

/**
 * Merge the next ivrConfig onto the user without dropping existing audio
 * and without ever assigning undefined to object paths.
 */
export function assignIvrConfig(
  user: { ivrConfig?: any; markModified?: (path: string) => void },
  next: Record<string, unknown>
) {
  const base = plainIvrConfig(user.ivrConfig);
  const merged: Record<string, unknown> = { ...base, ...next };
  for (const key of Object.keys(merged)) {
    if (merged[key] === undefined) delete merged[key];
  }
  merged.eventNameAudio = normalizeIvrAudioSubdoc(merged.eventNameAudio);
  merged.composedIntroAudio = normalizeIvrAudioSubdoc(
    merged.composedIntroAudio
  );
  merged.introAudio = normalizeIvrAudioSubdoc(merged.introAudio);
  // Absent approval must stay absent so older approved clips still dial.
  if (merged.recordingApproval == null) {
    delete merged.recordingApproval;
  } else {
    merged.recordingApproval = normalizeRecordingApproval(
      merged.recordingApproval
    );
  }
  user.ivrConfig = merged as any;
  if (typeof user.markModified === "function") {
    user.markModified("ivrConfig");
  }
}

export function ivrPersistErrorPayload(error: unknown): {
  error: string;
  message: string;
  status: number;
} {
  const raw = error instanceof Error ? error.message : String(error || "");
  if (/Cast to Object failed|ValidationError|CastError/i.test(raw)) {
    return {
      error: "IVR_SAVE_FAILED",
      message:
        "שמירת ההקלטה נכשלה בגלל מבנה נתונים לא תקין. הנתונים הקיימים לא נמחקו. נסו שוב.",
      status: 400,
    };
  }
  if (/NO_MONGO_ROW|IVR_GLOBAL_SEGMENT_MISSING/i.test(raw)) {
    return {
      error: "GLOBAL_AUDIO_MISSING",
      message:
        "קטע מהקריינות הגלובלית לא נמצא. לא נוצרה הקלטה חדשה ולא נדרס קובץ קיים.",
      status: 409,
    };
  }
  if (/IVR_COMPOSE|ffmpeg_failed|IVR_GLOBAL_SEGMENT/i.test(raw)) {
    return {
      error: "COMPOSE_FAILED",
      message:
        "שם האירוע נשמר. חיבור ההקלטה המלאה נכשל — נסו שוב בלי ליצור את הקול מחדש.",
      status: 500,
    };
  }
  return {
    error: "IVR_SAVE_FAILED",
    message: "שמירת ההגדרות נכשלה. נסו שוב.",
    status: 500,
  };
}
