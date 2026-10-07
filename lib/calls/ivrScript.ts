/**
 * Fixed Invistimo IVR script templates (Hebrew).
 * Global voice packs hold all fixed segments; per-event TTS is event name only.
 */

export type IvrScriptVariables = {
  /** Free-text event name, e.g. "החתונה של הדס ורועי" */
  eventName: string;
  /** Optional pronunciation used only for TTS — never changes displayed name. */
  eventNamePronunciation?: string;
};

export type IvrVoiceGender = "female" | "male";

export const IVR_SELF_RECORD_MAX_SECONDS = 45;
export const IVR_SELF_RECORD_RECOMMENDED_SECONDS = "20–30";

/**
 * Fixed global segments — generated once per gender (female / male), never per event.
 */
export const IVR_GLOBAL_PACK_TEXTS = {
  introBeforeEventName: "שלום, אנחנו מתקשרים בנוגע ל",
  introAfterEventName:
    "נשמח לדעת האם תוכלו להגיע ולחגוג איתנו. לאישור הגעה, הקישו 1. לאי הגעה, הקישו 2. אם עדיין אינכם יודעים, הקישו 3.",
  /** Inbound callback — different wording from outbound intro. */
  inboundBeforeEventName: "שלום, הגעתם למערכת אישורי ההגעה עבור ",
  inboundAfterEventName:
    "לאישור הגעה הקישו 1. לאי הגעה הקישו 2. אם עדיין אינכם יודעים הקישו 3.",
  afterPress1: "מעולה. אנא הקישו את מספר האורחים שיגיעו, כולל אתכם.",
  afterValidQuantity:
    "תודה רבה. אישור ההגעה שלכם התקבל. נתראה בשמחות.",
  afterPress2Or3: "תודה רבה. תשובתכם התקבלה.",
  invalidInput: "לא הצלחנו לזהות את הבחירה. אנא נסו שוב.",
  /** Extra system line (same global reuse rule). */
  invalidGuestCount:
    "המספר שהוקש אינו תקין. אנא הקישו שוב את מספר האורחים שיגיעו, כולל אתכם.",
  inboundAmbiguous:
    "שלום, לא הצלחנו לזהות בוודאות לאיזה אירוע שייכת השיחה. אנא פנו למארגנים או המתינו לשיחה חוזרת מאיתנו. להתראות.",
  inboundNotFound:
    "שלום, לא מצאנו הזמנה פעילה המשויכת למספר זה במערכת אישורי ההגעה. תודה והמשך יום נעים.",
} as const;

export type IvrGlobalPackSegmentKey = keyof typeof IVR_GLOBAL_PACK_TEXTS;

/** @deprecated aliases for older prompt key names — map to global pack segments. */
export const IVR_SYSTEM_PROMPTS = {
  askGuestCount: IVR_GLOBAL_PACK_TEXTS.afterPress1,
  thanksAttending: IVR_GLOBAL_PACK_TEXTS.afterValidQuantity,
  thanksReceived: IVR_GLOBAL_PACK_TEXTS.afterPress2Or3,
  invalidInput: IVR_GLOBAL_PACK_TEXTS.invalidInput,
  invalidGuestCount: IVR_GLOBAL_PACK_TEXTS.invalidGuestCount,
  inboundAmbiguous: IVR_GLOBAL_PACK_TEXTS.inboundAmbiguous,
  inboundNotFound: IVR_GLOBAL_PACK_TEXTS.inboundNotFound,
} as const;

export type IvrSystemPromptKey = keyof typeof IVR_SYSTEM_PROMPTS;

export const IVR_SYSTEM_PROMPT_TO_PACK_SEGMENT: Partial<
  Record<IvrSystemPromptKey, IvrGlobalPackSegmentKey>
> = {
  askGuestCount: "afterPress1",
  thanksAttending: "afterValidQuantity",
  thanksReceived: "afterPress2Or3",
  invalidInput: "invalidInput",
  invalidGuestCount: "invalidGuestCount",
  inboundAmbiguous: "inboundAmbiguous",
  inboundNotFound: "inboundNotFound",
};

/**
 * Hebrew definite-article absorption after ל:
 * "ל" + "החתונה..." → "לחתונה..." (not "להחתונה...").
 * Used only for display/legacy full-text builders — audio playback uses
 * separate global "בנוגע ל" + event-name clips per product spec.
 */
export function attachHebrewLamedPrefix(phrase: string): string {
  const raw = String(phrase || "").trim() || "האירוע";
  if (raw.startsWith("ה") && raw.length > 1) {
    return `ל${raw.slice(1)}`;
  }
  return `ל${raw}`;
}

/** Spoken event-name clip text (the only per-event TTS). */
export function buildIvrEventNameSpeechText(vars: IvrScriptVariables): string {
  return (
    String(vars.eventNamePronunciation || vars.eventName || "").trim() ||
    "האירוע"
  );
}

/**
 * Full intro as display/preview text (not a single TTS payload).
 * Matches the three audio clips clients hear concatenated.
 */
export function buildIvrIntroText(vars: IvrScriptVariables): string {
  const spokenName = buildIvrEventNameSpeechText(vars);
  return [
    `${IVR_GLOBAL_PACK_TEXTS.introBeforeEventName}${spokenName}.`,
    IVR_GLOBAL_PACK_TEXTS.introAfterEventName,
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

export function normalizeIvrVoiceGender(
  value: unknown
): IvrVoiceGender | null {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw === "female" || raw === "נשי" || raw === "f") return "female";
  if (raw === "male" || raw === "גברי" || raw === "m") return "male";
  return null;
}

/**
 * Exact inbound callback template:
 * "שלום, הגעתם למערכת אישורי ההגעה עבור [שם האירוע].
 * לאישור הגעה הקישו 1.
 * לאי הגעה הקישו 2.
 * אם עדיין אינכם יודעים הקישו 3."
 */
export function buildIvrInboundIntroText(vars: IvrScriptVariables): string {
  const spokenName = buildIvrEventNameSpeechText(vars);

  return [
    `שלום, הגעתם למערכת אישורי ההגעה עבור ${spokenName}.`,
    "לאישור הגעה הקישו 1.",
    "לאי הגעה הקישו 2.",
    "אם עדיין אינכם יודעים הקישו 3.",
  ].join("\n");
}

export function contentHashForIvrEventName(input: {
  eventName: string;
  eventNamePronunciation?: string;
  voiceGender: IvrVoiceGender | string;
  voiceId: string;
}): string {
  const parts = [
    String(input.eventName || "").trim(),
    String(input.eventNamePronunciation || "").trim(),
    String(input.voiceGender || "").trim(),
    String(input.voiceId || "").trim(),
  ];
  return parts.join("|");
}

/** @deprecated use contentHashForIvrEventName */
export function contentHashForIvrIntro(input: {
  eventName: string;
  eventNamePronunciation?: string;
  voiceId: string;
  voiceGender?: IvrVoiceGender | string;
}): string {
  return contentHashForIvrEventName({
    eventName: input.eventName,
    eventNamePronunciation: input.eventNamePronunciation,
    voiceGender: input.voiceGender || "",
    voiceId: input.voiceId,
  });
}

export function globalPackAudioKey(
  gender: IvrVoiceGender,
  segment: IvrGlobalPackSegmentKey
): string {
  return `pack:${gender}:${segment}`;
}
