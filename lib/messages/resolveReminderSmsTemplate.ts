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
    .replace(/\n*[^\n]*\{\{tableName\}\}[^\n]*\n*/g, "\n")
    .replace(/\{\{tableName\}\}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function guestHasAssignedTable(guest: {
  tableName?: unknown;
  tableNumber?: unknown;
}) {
  if (typeof guest?.tableName === "string" && guest.tableName.trim()) {
    return true;
  }

  return typeof guest?.tableNumber === "number";
}

export function getGuestTableDisplayName(guest: {
  tableName?: unknown;
  tableNumber?: unknown;
}) {
  if (typeof guest?.tableName === "string" && guest.tableName.trim()) {
    return guest.tableName.trim();
  }

  if (typeof guest?.tableNumber === "number") {
    return `שולחן ${guest.tableNumber}`;
  }

  return "";
}

export function normalizeHiddenTableIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const ids: string[] = [];

  for (const item of value) {
    const id = String(item || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

export function getEventReminderTableVisibility(event: {
  hideTableNumberForAll?: unknown;
  hiddenTableIds?: unknown;
} | null | undefined) {
  return {
    hideTableNumberForAll: Boolean(event?.hideTableNumberForAll),
    hiddenTableIds: normalizeHiddenTableIds(event?.hiddenTableIds),
  };
}

/**
 * האם להכניס מספר שולחן לגוף הודעת התזכורת — לפי מצב עדכני בלבד.
 */
export function shouldIncludeTableNumber({
  hideTableNumberForAll = false,
  hiddenTableIds = [],
  guestTableId,
  guestHasTable,
}: {
  hideTableNumberForAll?: boolean;
  hiddenTableIds?: string[];
  guestTableId?: unknown;
  guestHasTable: boolean;
}) {
  if (hideTableNumberForAll) return false;

  const tableId = String(guestTableId || "").trim();
  if (
    tableId &&
    normalizeHiddenTableIds(hiddenTableIds).includes(tableId)
  ) {
    return false;
  }

  return Boolean(guestHasTable);
}

/**
 * פונקציה מרכזית אחת לבניית תבנית התזכורת (מיידי + מתוזמן).
 * מקבלת את גוף ההודעה העדכני מהאדמין ומחליטה אם להשאיר את בלוק השולחן.
 */
export function buildLiveReminderSmsTemplate({
  body,
  includeTableNumber,
}: {
  body: string;
  includeTableNumber: boolean;
}) {
  const raw =
    String(body || "").trim() || REMINDER_WITH_TABLE_SERVER_TEMPLATE;

  if (includeTableNumber) {
    return raw;
  }

  return (
    stripTableBlockForGuestWithoutTable(raw) ||
    REMINDER_WITHOUT_TABLE_SERVER_TEMPLATE
  );
}

export function buildReminderSmsTemplateForGuest({
  body,
  event,
  guest,
}: {
  body: string;
  event?: {
    hideTableNumberForAll?: unknown;
    hiddenTableIds?: unknown;
  } | null;
  guest: {
    tableId?: unknown;
    tableName?: unknown;
    tableNumber?: unknown;
  };
}) {
  const visibility = getEventReminderTableVisibility(event);
  const includeTableNumber = shouldIncludeTableNumber({
    hideTableNumberForAll: visibility.hideTableNumberForAll,
    hiddenTableIds: visibility.hiddenTableIds,
    guestTableId: guest?.tableId,
    guestHasTable: guestHasAssignedTable(guest),
  });

  return {
    template: buildLiveReminderSmsTemplate({
      body,
      includeTableNumber,
    }),
    includeTableNumber,
    tableName: includeTableNumber ? getGuestTableDisplayName(guest) : "",
  };
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
