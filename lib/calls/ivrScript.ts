/**
 * Fixed Invistimo IVR script templates (Hebrew).
 * Client fills "שם האירוע"; post-DTMF lines are system-fixed audio.
 */

export type IvrScriptVariables = {
  /** Free-text event name, e.g. "החתונה של הדס ורועי" */
  eventName: string;
  /** Optional pronunciation used only for TTS — never changes displayed name. */
  eventNamePronunciation?: string;
};

export const IVR_SELF_RECORD_MAX_SECONDS = 45;
export const IVR_SELF_RECORD_RECOMMENDED_SECONDS = "20–30";

/**
 * Exact template:
 * "שלום, אנחנו מתקשרים בנוגע ל[שם האירוע].
 * נשמח לדעת האם תוכלו להגיע ולחגוג איתנו.
 * לאישור הגעה, הקישו 1.
 * לאי הגעה, הקישו 2.
 * אם עדיין אינכם יודעים, הקישו 3."
 */
/**
 * Hebrew definite-article absorption after ל:
 * "ל" + "החתונה..." → "לחתונה..." (not "להחתונה...").
 */
export function attachHebrewLamedPrefix(phrase: string): string {
  const raw = String(phrase || "").trim() || "האירוע";
  if (raw.startsWith("ה") && raw.length > 1) {
    return `ל${raw.slice(1)}`;
  }
  return `ל${raw}`;
}

export function buildIvrIntroText(vars: IvrScriptVariables): string {
  const spokenName =
    String(vars.eventNamePronunciation || vars.eventName || "").trim() ||
    "האירוע";

  return [
    `שלום, אנחנו מתקשרים בנוגע ${attachHebrewLamedPrefix(spokenName)}.`,
    "נשמח לדעת האם תוכלו להגיע ולחגוג איתנו.",
    "לאישור הגעה, הקישו 1.",
    "לאי הגעה, הקישו 2.",
    "אם עדיין אינכם יודעים, הקישו 3.",
  ].join("\n");
}

/** Recommended script for self-recording / preview (uses display event name). */
export function buildIvrRecommendedScriptForDisplay(vars: {
  eventName: string;
}): string {
  return buildIvrIntroText({
    eventName: vars.eventName,
  });
}

/**
 * Resolve event name from current or legacy config fields.
 * Legacy: eventTypeLabel + hostsNames → "<type> של <hosts>"
 */
export function resolveIvrEventName(cfg: {
  eventName?: unknown;
  eventTypeLabel?: unknown;
  hostsNames?: unknown;
} | null | undefined): string {
  const direct = String(cfg?.eventName || "").trim();
  if (direct) return direct;

  const type = String(cfg?.eventTypeLabel || "").trim();
  const hosts = String(cfg?.hostsNames || "").trim();
  if (type && hosts) return `${type} של ${hosts}`;
  if (type) return type;
  if (hosts) return hosts;
  return "";
}

export function resolveIvrEventNamePronunciation(cfg: {
  eventNamePronunciation?: unknown;
  hostsNamesPronunciation?: unknown;
} | null | undefined): string {
  return (
    String(cfg?.eventNamePronunciation || "").trim() ||
    String(cfg?.hostsNamesPronunciation || "").trim() ||
    ""
  );
}

export const IVR_SYSTEM_PROMPTS = {
  askGuestCount:
    "מעולה. אנא הקישו את מספר האורחים שיגיעו, כולל אתכם.",
  thanksAttending:
    "תודה רבה. אישור ההגעה שלכם התקבל. נתראה בשמחות.",
  thanksReceived: "תודה רבה. תשובתכם התקבלה.",
  invalidInput: "לא הצלחנו לזהות את הבחירה. אנא נסו שוב.",
  invalidGuestCount:
    "המספר שהוקש אינו תקין. אנא הקישו שוב את מספר האורחים שיגיעו, כולל אתכם.",
} as const;

export type IvrSystemPromptKey = keyof typeof IVR_SYSTEM_PROMPTS;

export function contentHashForIvrIntro(input: {
  eventName: string;
  eventNamePronunciation?: string;
  voiceId: string;
}): string {
  const parts = [
    String(input.eventName || "").trim(),
    String(input.eventNamePronunciation || "").trim(),
    String(input.voiceId || "").trim(),
  ];
  return parts.join("|");
}
