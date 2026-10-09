/**
 * Pure classification for IVR dial failures.
 * No network, no database, no audio generation.
 */

export type IvrUnansweredHangupStatus =
  | "busy"
  | "no_answer"
  | "voicemail"
  | "failed";

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
