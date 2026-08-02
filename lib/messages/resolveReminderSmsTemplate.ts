/**
 * תבניות תזכורת SMS — בחירת עם/בלי שולחן חייבת לקרות
 * ברגע השליחה בפועל לפי מצב האורח באותו רגע.
 */

export const AUTO_REMINDER_BY_TABLE = "__AUTO_REMINDER_BY_TABLE__";

export const REMINDER_WITH_TABLE_SERVER_TEMPLATE =
  "תזכורת לאירוע {{invitationTitle}}.\n\n" +
  "מספר השולחן שלך:\n" +
  "{{tableName}}\n\n" +
  "לכל פרטי האירוע והניווט:\n" +
  "{{navigationLink}}\n\n" +
  "נשמח לראותכם ❤️";

export const REMINDER_WITHOUT_TABLE_SERVER_TEMPLATE =
  "תזכורת לאירוע {{invitationTitle}}.\n\n" +
  "לכל פרטי האירוע והניווט:\n" +
  "{{navigationLink}}\n\n" +
  "נשמח לראותכם ❤️";

export function stripTableBlockForGuestWithoutTable(text: string) {
  return String(text || "")
    .replace(
      /\n*(?:השולחן שלך באירוע|מספר השולחן שלך באירוע|מספר השולחן שלך):\s*\n*(?:🪑\s*)?{{tableName}}\s*\n*/g,
      "\n"
    )
    .replace(
      /\n*(?:השולחן שלך באירוע|מספר השולחן שלך באירוע|מספר השולחן שלך):\s*\n*(?:🪑\s*)?\n*/g,
      "\n"
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isDefaultReminderSmsTemplate(text: string) {
  const normalized = String(text || "").trim();

  return (
    normalized === REMINDER_WITH_TABLE_SERVER_TEMPLATE.trim() ||
    normalized === REMINDER_WITHOUT_TABLE_SERVER_TEMPLATE.trim()
  );
}

export function isAutoReminderFlag(value: unknown) {
  return String(value || "").trim() === AUTO_REMINDER_BY_TABLE;
}

/**
 * בוחר את תבנית התזכורת לפי מצב השולחן של האורח ברגע השליחה.
 *
 * - יש שולחן → הודעה עם {{tableName}}
 * - אין שולחן → תזכורת בלבד (בלי בלוק שולחן)
 *
 * גם אם התבנית נשמרה מראש בלי שולחן (תזמון מוקדם),
 * ברגע השליחה משדרגים לתבנית עם שולחן אם לאורח כבר יש מספר.
 */
export function resolveReminderSmsTemplate({
  template,
  guestHasTable,
  isAutoReminder = false,
}: {
  template: string;
  guestHasTable: boolean;
  isAutoReminder?: boolean;
}): string {
  const raw = String(template || "").trim();

  if (isAutoReminder || isAutoReminderFlag(raw)) {
    return guestHasTable
      ? REMINDER_WITH_TABLE_SERVER_TEMPLATE
      : REMINDER_WITHOUT_TABLE_SERVER_TEMPLATE;
  }

  if (guestHasTable) {
    return raw.includes("{{tableName}}")
      ? raw
      : REMINDER_WITH_TABLE_SERVER_TEMPLATE;
  }

  const stripped = stripTableBlockForGuestWithoutTable(raw);
  return stripped || REMINDER_WITHOUT_TABLE_SERVER_TEMPLATE;
}
