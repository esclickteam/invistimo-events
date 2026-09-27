export type RoundSmsTemplateKey =
  | "rsvp"
  | "table"
  | "custom"
  | "reminder"
  | "thankyou";

export const ROUND_SMS_TEMPLATES: Record<
  RoundSmsTemplateKey,
  {
    requiresTable?: boolean;
    round1?: string;
    round2?: string;
    round3?: string;
    content?: string;
  }
> = {
  rsvp: {
    round1:
      "הוזמנתם לאירוע {{invitationTitle}}.\n\n" +
      "לצפייה בהזמנה ואישור הגעה לחצו כאן:\n" +
      "{{rsvpLink}}\n\n" +
      "מחכים לכם באהבה ❤️",

    round2:
      "תזכורת לאישור הגעה לאירוע {{invitationTitle}}.\n\n" +
      "לצפייה בהזמנה ואישור הגעה לחצו כאן:\n" +
      "{{rsvpLink}}\n\n" +
      "מחכים לעדכון ❤️",

    round3:
      "תזכורת לאישור הגעה לאירוע {{invitationTitle}}.\n\n" +
      "לצפייה בהזמנה ואישור הגעה לחצו כאן:\n" +
      "{{rsvpLink}}\n\n" +
      "מחכים לעדכון ❤️",
  },

  table: {
    requiresTable: false,
    content:
      "תזכורת לאירוע {{invitationTitle}}.\n\n" +
      "מספר השולחן שלך:\n" +
      "{{tableName}}\n\n" +
      "לכל פרטי האירוע והניווט:\n" +
      "{{navigationLink}}\n\n" +
      "נשמח לראותכם ❤️",
  },

  reminder: {
    requiresTable: false,
    content:
      "תזכורת לאירוע {{invitationTitle}}.\n\n" +
      "מספר השולחן שלך:\n" +
      "{{tableName}}\n\n" +
      "לכל פרטי האירוע והניווט:\n" +
      "{{navigationLink}}\n\n" +
      "נשמח לראותכם ❤️",
  },

  custom: {
    content:
      "שמחנו לראותך באירוע {{invitationTitle}} ❤️\n\n" +
      "תודה שהגעת לחגוג איתנו.",
  },

  thankyou: {
    content:
      "שמחנו לראותך באירוע {{invitationTitle}} ❤️\n\n" +
      "תודה שהגעת לחגוג איתנו.",
  },
};

export function getRsvpSmsRoundTemplate(round: number) {
  const t = ROUND_SMS_TEMPLATES.rsvp;
  if (round === 3) return t.round3 ?? t.round2 ?? "";
  if (round === 2) return t.round2 ?? "";
  return t.round1 ?? "";
}

export function countBusinessSmsParts(text: string) {
  const length = [...text].length;

  if (length <= 200) return 1;
  if (length <= 320) return 2;

  return -1;
}
