/**
 * Pure classification for IVR dial failures.
 * No network, no database, no audio generation.
 */

export type IvrUnansweredHangupStatus =
  | "busy"
  | "no_answer"
  | "voicemail"
  | "failed";

/** A dial that never rang or was answered can be stale after this silence. */
export const STALE_UNANSWERED_MS = 4 * 60 * 1000;
/** An answered call is stale only after this long with no new progress. */
export const STALE_ANSWERED_MS = 8 * 60 * 1000;

const ACTIVE_CALL_FLOW = new Set([
  "answer_delay",
  "playing_intro",
  "playing_intro_before",
  "playing_event_name",
  "playing_intro_after",
  "gather_choice",
  "playing_ask_count",
  "gather_count",
  "playing_thanks",
  "playing_invalid",
  "playing_system",
]);

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Latest stored sign that the leg is still moving. */
export function outboundProgressAt(attempt: {
  dialRequestedAt?: unknown;
  ringingAt?: unknown;
  answeredAt?: unknown;
  playbackCommandAt?: unknown;
  playbackStartedAt?: unknown;
  firstDigitAt?: unknown;
  choiceDigitAt?: unknown;
  followupPlaybackStartedAt?: unknown;
  dialLockedAt?: unknown;
  startedAt?: unknown;
  updatedAt?: unknown;
  timeline?: Array<{ at?: unknown }> | null;
}): Date | null {
  const stamps = [
    attempt.dialRequestedAt,
    attempt.ringingAt,
    attempt.answeredAt,
    attempt.playbackCommandAt,
    attempt.playbackStartedAt,
    attempt.firstDigitAt,
    attempt.choiceDigitAt,
    attempt.followupPlaybackStartedAt,
    attempt.dialLockedAt,
    attempt.startedAt,
    attempt.updatedAt,
    ...(Array.isArray(attempt.timeline) ? attempt.timeline.map((entry) => entry?.at) : []),
  ];
  let latest: Date | null = null;
  for (const stamp of stamps) {
    const date = asDate(stamp);
    if (!date) continue;
    if (!latest || date.getTime() > latest.getTime()) latest = date;
  }
  return latest;
}

export type StaleOutboundAction = "keep" | "stuck_dial" | "stuck_hangup";

/**
 * Local state only. A ringing or answered call with recent progress stays.
 * A silent record is only a candidate; the dialer still asks Telnyx before
 * freeing a leg that has a call id.
 */
export function staleOutboundReleaseAction(
  attempt: {
    status?: unknown;
    flowStep?: unknown;
    answered?: unknown;
    rsvpApplied?: unknown;
    endedAt?: unknown;
    ringingAt?: unknown;
    answeredAt?: unknown;
    dialRequestedAt?: unknown;
    playbackCommandAt?: unknown;
    playbackStartedAt?: unknown;
    firstDigitAt?: unknown;
    choiceDigitAt?: unknown;
    followupPlaybackStartedAt?: unknown;
    dialLockedAt?: unknown;
    startedAt?: unknown;
    updatedAt?: unknown;
    timeline?: Array<{ at?: unknown }> | null;
  },
  now: Date
): StaleOutboundAction {
  if (attempt.rsvpApplied === true) return "keep";
  if (asDate(attempt.endedAt)) return "keep";
  if (String(attempt.flowStep || "") === "done") return "keep";

  const status = String(attempt.status || "");
  if (
    ![
      "queued",
      "initiated",
      "ringing",
      "answered",
      "invalid_input",
      "completed",
    ].includes(status)
  ) {
    return "keep";
  }

  const progress = outboundProgressAt(attempt);
  const age = progress ? now.getTime() - progress.getTime() : Number.POSITIVE_INFINITY;
  const inConversation =
    attempt.answered === true ||
    status === "answered" ||
    status === "invalid_input" ||
    status === "completed" ||
    ACTIVE_CALL_FLOW.has(String(attempt.flowStep || ""));

  if (inConversation) {
    return age >= STALE_ANSWERED_MS ? "stuck_hangup" : "keep";
  }

  if (status === "ringing" || asDate(attempt.ringingAt) || asDate(attempt.answeredAt)) {
    return age >= STALE_UNANSWERED_MS ? "stuck_dial" : "keep";
  }

  return age >= STALE_UNANSWERED_MS ? "stuck_dial" : "keep";
}

/**
 * Free the slot only when local state says the leg is stuck and, if Telnyx
 * has a call id, the provider says that call is already over.
 * Unknown provider state keeps the slot so a live call is not cut off.
 */
export function shouldReleaseStaleOutbound(input: {
  action: StaleOutboundAction;
  hasCallControlId: boolean;
  liveness: "alive" | "ended" | "unknown";
}) {
  if (input.action === "keep") return false;
  if (!input.hasCallControlId) return input.action === "stuck_dial";
  return input.liveness === "ended";
}

/** E.164 that Telnyx can accept. Israeli numbers must not keep the trunk 0. */
export function isDialableE164(phone: string) {
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return false;
  if (phone.startsWith("+972")) {
    const national = phone.slice(4);
    if (!national || national.startsWith("0")) return false;
    return national.length === 8 || national.length === 9;
  }
  return true;
}

/**
 * A second dial is allowed only for a temporary provider or network failure
 * that never received a call id. Invalid numbers, auth, and blocked test
 * mode stay failed.
 */
export function isIvrDialRetryable(raw: unknown) {
  const text = String(raw || "").trim();
  if (!text) return false;
  if (
    /INVALID_PHONE|INVALID_NUMBER|DIAL_BLOCKED|AUDIO_NOT_READY|TELNYX_API_KEY is missing|TELNYX_CONNECTION_ID is missing|STALE_DIAL_NO_RESULT|STALE_CALL_NO_HANGUP/.test(
      text
    )
  ) {
    return false;
  }

  const status = text.match(/TELNYX_CREATE_IVR_CALL_FAILED \((\d+)\)/);
  if (status) {
    const code = Number(status[1]);
    return code === 408 || code === 429 || code >= 500;
  }

  return /timeout|ETIMEDOUT|ECONNRESET|EAI_AGAIN|fetch failed|network/i.test(
    text
  );
}

export function classifyUnansweredHangup(causeRaw: unknown): {
  status: IvrUnansweredHangupStatus;
  error: string;
} {
  const cause = String(causeRaw || "").trim().toLowerCase();

  if (
    cause.includes("unallocated") ||
    cause.includes("invalid_number") ||
    cause.includes("invalid number") ||
    cause.includes("number_changed") ||
    cause.includes("unassigned_number")
  ) {
    return { status: "failed", error: "INVALID_NUMBER" };
  }

  if (
    cause.includes("busy") ||
    cause === "call_rejected" ||
    cause === "user_busy"
  ) {
    return { status: "busy", error: "" };
  }

  if (cause.includes("voicemail") || cause.includes("machine")) {
    return { status: "voicemail", error: "" };
  }

  return { status: "no_answer", error: "" };
}

/** Customer-facing text for a stored attempt error. Keeps the provider detail. */
export function explainIvrCallFailure(raw: unknown): string {
  const text = String(raw || "").trim();
  if (!text) return "החיוג נכשל";

  if (text === "INVALID_PHONE" || text === "INVALID_NUMBER") {
    return "מספר לא תקין. החיוג לא יצא, והשיחה לא סומנה כנענתה.";
  }

  if (text === "AUDIO_NOT_READY") {
    return "קובץ הקריינות המאושר לא היה מוכן. לא נוצרה קריינות בזמן השיחה.";
  }

  if (text === "STALE_DIAL_NO_RESULT") {
    return "החיוג נשאר פתוח בלי תוצאה מהספק ושוחרר כדי לא לחסום שיחות חדשות. לא סומן כנענה.";
  }

  if (text === "STALE_CALL_NO_HANGUP") {
    return "השיחה נענתה אבל לא נסגרה אצל הספק, ושוחררה בלי לשנות את אישור ההגעה.";
  }

  if (text === "PARALLEL_CAP") {
    return "ערוצי החיוג תפוסים כרגע. הסבב ימשיך אוטומטית כשערוץ יתפנה.";
  }

  if (
    text.includes("DIAL_BLOCKED_TEST_MODE") ||
    text.includes("אין אישור חיוג חי")
  ) {
    return "השיחה לא נשלחה ל-Telnyx. חיוג חי היה חסום בשרת, ולכן אין מזהה שיחה ואין תשובת ספק.";
  }

  if (
    text.includes("TELNYX_API_KEY is missing") ||
    text.includes("TELNYX_CONNECTION_ID is missing")
  ) {
    return "השיחה לא נשלחה: חסר מפתח או מזהה חיבור של Telnyx בשרת.";
  }

  const telnyx = text.match(/TELNYX_CREATE_IVR_CALL_FAILED \((\d+)\)/);
  if (telnyx) {
    let detail = "";
    const jsonAt = text.search(/[\[{]/);
    if (jsonAt >= 0) {
      try {
        const parsed = JSON.parse(text.slice(jsonAt));
        const first = Array.isArray(parsed) ? parsed[0] : parsed;
        detail = String(
          first?.detail || first?.title || first?.code || ""
        ).trim();
      } catch {
        detail = "";
      }
    }
    const code = telnyx[1];
    if (code === "422" || code === "400") {
      return detail
        ? `Telnyx דחה את המספר או את בקשת החיוג (${code}): ${detail}`
        : `Telnyx דחה את בקשת החיוג (סטטוס ${code}).`;
    }
    if (code === "401" || code === "403") {
      return detail
        ? `Telnyx סירב להרשאה (${code}): ${detail}`
        : `Telnyx סירב להרשאה (סטטוס ${code}).`;
    }
    return detail
      ? `Telnyx דחה את החיוג (${code}): ${detail}`
      : `Telnyx דחה את החיוג (סטטוס ${code}).`;
  }

  if (text === "החיוג נכשל") {
    return "החיוג נכשל לפני חיבור לספק.";
  }

  return text;
}
