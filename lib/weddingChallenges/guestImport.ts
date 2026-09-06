export type ImportedChallengeGuest = {
  name: string;
  phone: string;
  tableNumber: number | null;
  isAdult: boolean;
};

export type GuestImportIssue = {
  row: number;
  message: string;
};

export type GuestImportResult = {
  guests: ImportedChallengeGuest[];
  issues: GuestImportIssue[];
  skipped: number;
};

const NAME_HEADERS = [
  "name",
  "fullname",
  "full name",
  "firstname",
  "first name",
  "guest",
  "guestname",
  "שם",
  "שם מלא",
  "שם פרטי",
  "אורח",
  "שם האורח",
];

const PHONE_HEADERS = [
  "phone",
  "mobile",
  "tel",
  "telephone",
  "cellphone",
  "טלפון",
  "נייד",
  "פלאפון",
  "מספר טלפון",
];

const TABLE_HEADERS = [
  "table",
  "tablenumber",
  "table number",
  "table no",
  "seat",
  "שולחן",
  "מספר שולחן",
  "מס שולחן",
  "מס' שולחן",
  "מס׳ שולחן",
];

const ADULT_HEADERS = [
  "adult",
  "isadult",
  "is adult",
  "18+",
  "age",
  "מבוגר",
  "גיל",
  "בגיר",
];

function normalizeHeader(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/['׳"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeHeaderRow(cells: string[]) {
  const blob = cells.map(normalizeHeader).join(" ");
  return (
    NAME_HEADERS.some((h) => blob.includes(h)) ||
    PHONE_HEADERS.some((h) => blob.includes(h))
  );
}

function headerKind(value: unknown): "name" | "phone" | "table" | "adult" | null {
  const header = normalizeHeader(value);
  if (!header) return null;
  if (NAME_HEADERS.includes(header)) return "name";
  if (PHONE_HEADERS.includes(header)) return "phone";
  if (TABLE_HEADERS.includes(header)) return "table";
  if (ADULT_HEADERS.includes(header)) return "adult";
  return null;
}

export function normalizeGuestPhone(value: unknown) {
  let digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("972") && digits.length >= 12) {
    digits = `0${digits.slice(3)}`;
  }
  if (digits.length === 9 && digits.startsWith("5")) {
    digits = `0${digits}`;
  }
  return digits;
}

export function parseTableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const text = String(value).replace(/שולחן/g, "").trim();
  const match = text.match(/\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseAdultFlag(value: unknown, fallback = true) {
  if (value == null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const text = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "כן", "מבוגר", "בגיר", "adult"].includes(text)) {
    return true;
  }
  if (["0", "false", "no", "n", "לא", "קטין", "ילד", "child", "minor"].includes(text)) {
    return false;
  }
  const age = Number(text);
  if (Number.isFinite(age)) return age >= 18;
  return fallback;
}

function splitLine(line: string) {
  if (line.includes("\t")) return line.split("\t").map((part) => part.trim());
  if (line.includes("|")) return line.split("|").map((part) => part.trim());
  if (line.includes(",")) return line.split(",").map((part) => part.trim());
  if (line.includes(";")) return line.split(";").map((part) => part.trim());
  return line.trim().split(/\s{2,}/).map((part) => part.trim());
}

function pickPhoneCell(cells: string[]) {
  for (let i = 0; i < cells.length; i += 1) {
    const phone = normalizeGuestPhone(cells[i]);
    if (phone.length >= 9) return { phone, index: i };
  }
  return null;
}

function guestFromCells(cells: string[], fallbackAdult = true): ImportedChallengeGuest | null {
  const cleaned = cells.map((cell) => String(cell || "").trim()).filter((cell, idx, arr) => {
    if (cell) return true;
    return idx < arr.length - 1;
  });
  if (!cleaned.length) return null;

  const phoneHit = pickPhoneCell(cleaned);
  if (!phoneHit) return null;

  const withoutPhone = cleaned.filter((_, idx) => idx !== phoneHit.index);
  let tableNumber: number | null = null;
  let isAdult = fallbackAdult;
  const nameParts: string[] = [];

  for (const cell of withoutPhone) {
    const table = parseTableNumber(cell);
    if (table != null && /שולחן|\d/.test(cell) && cell.replace(/שולחן/g, "").trim().length <= 6) {
      tableNumber = table;
      continue;
    }
    if (["כן", "לא", "מבוגר", "קטין", "adult", "child"].includes(cell.toLowerCase())) {
      isAdult = parseAdultFlag(cell, fallbackAdult);
      continue;
    }
    nameParts.push(cell);
  }

  const name = nameParts.join(" ").replace(/\s+/g, " ").trim();
  if (!name) return null;

  return {
    name,
    phone: phoneHit.phone,
    tableNumber,
    isAdult,
  };
}

export function parseGuestRecords(
  records: Array<Record<string, unknown>>,
  options?: { defaultAdult?: boolean }
): GuestImportResult {
  const defaultAdult = options?.defaultAdult !== false;
  const guests: ImportedChallengeGuest[] = [];
  const issues: GuestImportIssue[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  records.forEach((record, index) => {
    const row = index + 1;
    const mapped: Partial<Record<"name" | "phone" | "table" | "adult", unknown>> = {};
    const leftovers: unknown[] = [];

    for (const [key, value] of Object.entries(record || {})) {
      const kind = headerKind(key);
      if (kind) mapped[kind] = value;
      else leftovers.push(value);
    }

    const name = String(mapped.name || leftovers[0] || "")
      .replace(/\s+/g, " ")
      .trim();
    const phone = normalizeGuestPhone(mapped.phone ?? leftovers[1]);
    const tableNumber = parseTableNumber(mapped.table ?? leftovers[2]);
    const isAdult = parseAdultFlag(mapped.adult ?? leftovers[3], defaultAdult);

    if (!name && !phone) {
      skipped += 1;
      return;
    }
    if (!name) {
      issues.push({ row, message: "חסר שם" });
      skipped += 1;
      return;
    }
    if (!phone || phone.length < 9) {
      issues.push({ row, message: "חסר טלפון תקין" });
      skipped += 1;
      return;
    }
    if (seen.has(phone)) {
      issues.push({ row, message: "טלפון כפול ברשימה" });
      skipped += 1;
      return;
    }

    seen.add(phone);
    guests.push({ name, phone, tableNumber, isAdult });
  });

  return { guests, issues, skipped };
}

export function parseGuestListText(
  text: string,
  options?: { defaultAdult?: boolean }
): GuestImportResult {
  const defaultAdult = options?.defaultAdult !== false;
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { guests: [], issues: [], skipped: 0 };
  }

  const firstCells = splitLine(lines[0]);
  const hasHeader = looksLikeHeaderRow(firstCells);
  const body = hasHeader ? lines.slice(1) : lines;

  if (hasHeader) {
    const keys = firstCells.map((cell) => normalizeHeader(cell) || cell);
    const records = body.map((line) => {
      const cells = splitLine(line);
      const record: Record<string, unknown> = {};
      keys.forEach((key, idx) => {
        record[key] = cells[idx] ?? "";
      });
      return record;
    });
    return parseGuestRecords(records, { defaultAdult });
  }

  const guests: ImportedChallengeGuest[] = [];
  const issues: GuestImportIssue[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  body.forEach((line, index) => {
    const row = index + 1;
    const parsed = guestFromCells(splitLine(line), defaultAdult);
    if (!parsed) {
      issues.push({ row, message: "לא הצלחנו לקרוא שם וטלפון" });
      skipped += 1;
      return;
    }
    if (seen.has(parsed.phone)) {
      issues.push({ row, message: "טלפון כפול ברשימה" });
      skipped += 1;
      return;
    }
    seen.add(parsed.phone);
    guests.push(parsed);
  });

  return { guests, issues, skipped };
}

export function worksheetRowsToRecords(rows: unknown[][]): Array<Record<string, unknown>> {
  if (!rows.length) return [];
  const header = (rows[0] || []).map((cell) => String(cell || "").trim());
  const useHeader = looksLikeHeaderRow(header);
  if (!useHeader) {
    return rows.map((row) => {
      const cells = (row || []).map((cell) => String(cell ?? "").trim());
      return {
        name: cells[0] || "",
        phone: cells[1] || "",
        table: cells[2] || "",
        adult: cells[3] || "",
      };
    });
  }
  return rows.slice(1).map((row) => {
    const record: Record<string, unknown> = {};
    header.forEach((key, idx) => {
      if (!key) return;
      record[key] = row?.[idx] ?? "";
    });
    return record;
  });
}
