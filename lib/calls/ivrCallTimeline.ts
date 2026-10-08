/**
 * Append-only IVR timeline. Entries are facts from Telnyx webhooks or from
 * commands this server sent. Missing history stays empty — callers must not
 * invent playback or keypress times.
 */

import IvrCallAttempt from "@/models/IvrCallAttempt";

const MAX_TIMELINE = 120;

export type IvrTimelineSource = "telnyx" | "server";

export type IvrTimelineInput = {
  at?: Date;
  source: IvrTimelineSource;
  kind: string;
  label: string;
  detail?: string;
  eventType?: string;
  digit?: string;
  stage?: string;
};

function clip(value: unknown, max: number) {
  return String(value || "").trim().slice(0, max);
}

export function ivrEventInstant(body: any) {
  const raw =
    body?.data?.occurred_at ||
    body?.occurred_at ||
    body?.data?.payload?.occurred_at;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function describeIvrTelnyxEvent(eventType: string, payload: any) {
  const type = clip(eventType, 80);
  const digit = clip(payload?.digit, 8);
  const digits = clip(payload?.digits, 16);
  const status = clip(payload?.status, 40);
  const cause = clip(payload?.hangup_cause || payload?.state, 80);
  const source = clip(payload?.hangup_source, 40);

  if (type === "call.initiated") {
    return { kind: "initiated", label: "נשלחה בקשת חיוג", digit: "", detail: "", stage: "" };
  }
  if (type === "call.ringing") {
    return { kind: "ringing", label: "השיחה מצלצלת", digit: "", detail: "", stage: "" };
  }
  if (type === "call.answered") {
    return { kind: "answered", label: "האורח ענה", digit: "", detail: "", stage: "" };
  }
  if (type === "call.hangup") {
    const detail = [cause && `cause=${cause}`, source && `source=${source}`]
      .filter(Boolean)
      .join(" ");
    return { kind: "hangup", label: "השיחה הסתיימה", digit: "", detail, stage: "" };
  }
  if (type === "call.dtmf.received") {
    return {
      kind: "dtmf",
      label: digit ? `נקלטה הקשה ${digit}` : "נקלטה הקשה",
      digit,
      detail: "",
      stage: "",
    };
  }
  if (type === "call.gather.ended") {
    return {
      kind: "gather_ended",
      label: digits ? `הסתיימה קליטת ספרות ${digits}` : "הסתיימה קליטת ספרות",
      digit: digits,
      detail: status,
      stage: "",
    };
  }
  if (type === "call.playback.started" || type === "call.speak.started") {
    return {
      kind: "playback_started",
      label: "התחילה השמעה",
      digit: "",
      detail: type,
      stage: "",
    };
  }
  if (type === "call.playback.ended" || type === "call.speak.ended") {
    return {
      kind: "playback_ended",
      label: "הסתיימה השמעה",
      digit: "",
      detail: status,
      stage: "",
    };
  }
  if (type === "call.machine.detection.ended") {
    return {
      kind: "machine",
      label: "התקבלה תוצאת זיהוי משיבון",
      digit: "",
      detail: clip(payload?.result || payload?.result_type, 80),
      stage: "",
    };
  }
  return {
    kind: "webhook",
    label: type || "אירוע",
    digit: digit || digits,
    detail: status,
    stage: "",
  };
}

export function playbackCommandLabel(stage: string) {
  const raw = clip(stage, 80);
  if (raw.includes("hangup_after")) return "נשלחה פקודת השמעה: הודעת סיום";
  if (raw === "count" || raw.includes("ask")) return "נשלחה פקודת השמעה: מספר מגיעים";
  if (raw.includes("event_name")) return "נשלחה פקודת השמעה: פתיח";
  if (raw.includes("intro_after") || raw.includes("play_after")) {
    return "נשלחה פקודת השמעה: שם האירוע";
  }
  if (raw.includes("choice") || raw.includes("after")) {
    return "נשלחה פקודת השמעה: המשך";
  }
  return "נשלחה פקודת השמעה";
}

export function buildTimelineEntry(input: IvrTimelineInput) {
  const at =
    input.at instanceof Date && !Number.isNaN(input.at.getTime())
      ? input.at
      : new Date();
  return {
    at,
    source: input.source,
    kind: clip(input.kind, 40),
    label: clip(input.label, 160),
    detail: clip(input.detail, 300),
    eventType: clip(input.eventType, 80),
    digit: clip(input.digit, 16),
    stage: clip(input.stage, 80),
  };
}

export async function pushIvrTimeline(
  attemptId: unknown,
  input: IvrTimelineInput,
  options?: {
    setIfEmpty?: Record<string, Date>;
    setFollowupPlayback?: Date;
  }
) {
  if (!attemptId) return;
  const entry = buildTimelineEntry(input);
  const setStage: Record<string, unknown> = {
    timeline: {
      $slice: [
        {
          $concatArrays: [{ $ifNull: ["$timeline", []] }, [entry]],
        },
        -MAX_TIMELINE,
      ],
    },
  };

  for (const [key, value] of Object.entries(options?.setIfEmpty || {})) {
    if (!/^[A-Za-z]+$/.test(key) || !(value instanceof Date)) continue;
    setStage[key] = { $ifNull: [`$${key}`, value] };
  }

  if (options?.setFollowupPlayback instanceof Date) {
    setStage.followupPlaybackStartedAt = {
      $cond: [
        {
          $and: [
            { $eq: [{ $ifNull: ["$followupPlaybackStartedAt", null] }, null] },
            { $ne: [{ $ifNull: ["$firstDigitAt", null] }, null] },
          ],
        },
        options.setFollowupPlayback,
        "$followupPlaybackStartedAt",
      ],
    };
  }

  await IvrCallAttempt.updateOne({ _id: attemptId } as any, [
    { $set: setStage },
  ] as any);
}

export function notePlaybackCommand(clientState?: Record<string, unknown>) {
  const attemptId = clientState?.callAttemptId || clientState?.call_attempt_id;
  if (!attemptId) return Promise.resolve();
  const stage = clip(clientState?.stage, 80);
  return pushIvrTimeline(
    attemptId,
    {
      source: "server",
      kind: "playback_command",
      label: playbackCommandLabel(stage),
      detail: "פקודת שרת. אינה מאשרת שהשמעה התחילה אצל הספק.",
      stage,
    },
    { setIfEmpty: { playbackCommandAt: new Date() } }
  ).catch((error) => {
    console.error(
      "IVR_TIMELINE",
      error instanceof Error ? error.message : error
    );
  });
}
