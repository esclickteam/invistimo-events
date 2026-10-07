/**
 * Fixed Invistimo IVR script templates (Hebrew).
 * Client fills variables; post-DTMF lines are system-fixed audio.
 */

export type IvrScriptVariables = {
  eventTypeLabel: string;
  hostsNames: string;
  /** Optional pronunciation used only for TTS — not stored as display names. */
  hostsNamesPronunciation?: string;
};

export const IVR_SELF_RECORD_MAX_SECONDS = 45;
export const IVR_SELF_RECORD_RECOMMENDED_SECONDS = "20–30";

export function buildIvrIntroText(vars: IvrScriptVariables): string {
  const eventType = String(vars.eventTypeLabel || "").trim() || "האירוע";
  const namesForSpeech = String(
    vars.hostsNamesPronunciation || vars.hostsNames || ""
  ).trim() || "בעלי האירוע";

  return [
    `שלום, אנחנו מתקשרים בנוגע ל${eventType} של ${namesForSpeech}.`,
    "נשמח לדעת האם תוכלו להגיע ולחגוג איתנו.",
    "לאישור הגעה, הקישו 1.",
    "לאי הגעה, הקישו 2.",
    "אם עדיין אינכם יודעים, הקישו 3.",
  ].join("\n");
}

/** Recommended script shown above self-recording (uses display names). */
export function buildIvrRecommendedScriptForDisplay(vars: {
  eventTypeLabel: string;
  hostsNames: string;
}): string {
  return buildIvrIntroText({
    eventTypeLabel: vars.eventTypeLabel,
    hostsNames: vars.hostsNames,
  });
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
  eventTypeLabel: string;
  hostsNames: string;
  hostsNamesPronunciation?: string;
  voiceId: string;
}): string {
  const parts = [
    String(input.eventTypeLabel || "").trim(),
    String(input.hostsNames || "").trim(),
    String(input.hostsNamesPronunciation || "").trim(),
    String(input.voiceId || "").trim(),
  ];
  return parts.join("|");
}
