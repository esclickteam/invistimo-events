import ExcelJS from "exceljs";
import { isValidWhatsappPhone } from "@/lib/whatsapp/roundReport";

/* =========================
   Types (same shape as report API / UI)
========================= */

export type ExcelReportStatus =
  | "not_sent"
  | "scheduled"
  | "pending"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "cancelled"
  | string;

export type ExcelReportMessage = {
  id: string;
  roundKey?: string;
  roundTitle?: string;
  roundType?: string;
  messageTypeLabel?: string;
  templateName?: string;
  status?: ExcelReportStatus;
  statusLabel?: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  failedAt?: string | null;
  scheduledAt?: string | null;
  createdAt?: string | null;
  attemptedAt?: string | null;
  errorMessage?: string;
  messageId?: string;
  rsvp?: string;
  rsvpLabel?: string;
};

export type ExcelReportGuest = {
  id: string;
  name: string;
  phone: string;
  rsvp: "yes" | "no" | "pending" | string;
  rsvpLabel: string;
  messagesCount: number;
  receivedCount: number;
  failedCount: number;
  pendingCount: number;
  overallStatus: ExcelReportStatus;
  overallStatusLabel: string;
  lastStatus: ExcelReportStatus;
  lastStatusLabel: string;
  lastMessageAt?: string | null;
  lastRoundTitle?: string | null;
  everDelivered: boolean;
  everRead: boolean;
  everFailed: boolean;
  notSentReason?: string | null;
  notSentReasonKey?: string | null;
  lastError?: string;
  roundsSentCount: number;
  roundsTotal: number;
  messages?: ExcelReportMessage[];
};

export type ExcelReportRound = {
  key: string;
  title: string;
  type?: string;
  typeLabel?: string;
  round?: number;
  total: number;
  intended?: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  pending: number;
  notSent?: number;
  summary?: {
    intended?: number;
    notSent?: number;
    sent?: number;
    delivered?: number;
    read?: number;
    failed?: number;
    pending?: number;
  };
};

export type ExcelGuestSummary = {
  totalGuests: number;
  receivedAtLeastOne: number;
  receivedNone: number;
  readAtLeastOnce: number;
  deliveredAtLeastOnce: number;
  failedAtLeastOnce: number;
  receivedMultiple: number;
  pending: number;
};

export type ExportWhatsappRoundReportInput = {
  /** Unique-guest KPIs from GET /api/whatsapp/round-report — same as UI */
  summary: ExcelGuestSummary;
  /** Round cards from the same API response */
  rounds: ExcelReportRound[];
  /** Full guest list from API (for RSVP / attention KPIs) */
  allGuests: ExcelReportGuest[];
  /** Guests currently shown in the table (respects UI filters) */
  guestsForSheets: ExcelReportGuest[];
  invitationTitle?: string;
  eventDate?: string | null;
  clientName?: string | null;
  selectedRoundKey?: string;
  selectedRoundTitle?: string | null;
  generatedAt?: string | Date;
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "E5DDD2" } },
  left: { style: "thin", color: { argb: "E5DDD2" } },
  bottom: { style: "thin", color: { argb: "E5DDD2" } },
  right: { style: "thin", color: { argb: "E5DDD2" } },
};

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "F5EFE6" },
};

const TITLE_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "F8F1E6" },
};

const SECTION_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF8F0" },
};

function statusFill(status?: string): ExcelJS.Fill | undefined {
  const key = String(status || "").toLowerCase();

  const map: Record<string, string> = {
    read: "E8F8EF",
    נקרא: "E8F8EF",
    delivered: "E7F6F4",
    נמסר: "E7F6F4",
    sent: "E8F1FB",
    נשלח: "E8F1FB",
    pending: "FFF4E5",
    scheduled: "FFF4E5",
    sending: "FFF4E5",
    ממתין: "FFF4E5",
    מתוזמן: "FFF4E5",
    failed: "FDECEC",
    נכשל: "FDECEC",
    not_sent: "F3F0EC",
    "לא נשלח": "F3F0EC",
    cancelled: "F3F0EC",
    בוטל: "F3F0EC",
  };

  const color = map[key];
  if (!color) return undefined;

  return {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: color },
  };
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

function formatDateOnly(value?: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatFileDate(value?: string | Date | null) {
  if (!value) {
    const now = new Date();
    return formatFileDate(now);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown-date";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function sanitizeFilePart(value: string) {
  return String(value || "event")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "event";
}

function pct(part: number, whole: number) {
  if (!whole || whole <= 0) return 0;
  return part / whole;
}

function yesNo(value: boolean) {
  return value ? "כן" : "לא";
}

function getLatestMessageField(
  messages: ExcelReportMessage[] | undefined,
  field: keyof ExcelReportMessage
) {
  if (!messages?.length) return null;
  let best: string | null = null;
  let bestTs = 0;
  for (const message of messages) {
    const raw = message[field];
    if (!raw || typeof raw !== "string") continue;
    const ts = new Date(raw).getTime();
    if (!Number.isNaN(ts) && ts >= bestTs) {
      bestTs = ts;
      best = raw;
    }
  }
  return best;
}

function applyRtlSheet(sheet: ExcelJS.Worksheet) {
  sheet.views = [{ rightToLeft: true, showGridLines: false, state: "frozen" }];
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, size: 11, color: { argb: "5F4A38" } };
  row.fill = HEADER_FILL;
  row.alignment = { vertical: "middle", horizontal: "right", wrapText: true };
  row.height = 22;
  row.eachCell((cell) => {
    cell.border = THIN_BORDER;
  });
}

function styleDataCell(cell: ExcelJS.Cell, opts?: { status?: string; wrap?: boolean }) {
  cell.border = THIN_BORDER;
  cell.alignment = {
    vertical: "middle",
    horizontal: "right",
    wrapText: Boolean(opts?.wrap),
  };
  const fill = statusFill(opts?.status);
  if (fill) cell.fill = fill;
}

function addSectionTitle(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  title: string,
  colSpan: number
) {
  sheet.mergeCells(rowNumber, 1, rowNumber, colSpan);
  const cell = sheet.getCell(rowNumber, 1);
  cell.value = title;
  cell.font = { bold: true, size: 13, color: { argb: "3A2A1C" } };
  cell.fill = SECTION_FILL;
  cell.alignment = { horizontal: "right", vertical: "middle" };
  cell.border = THIN_BORDER;
  sheet.getRow(rowNumber).height = 24;
}

/**
 * Build a professional 3-sheet WhatsApp report workbook.
 * KPIs must come from the same API summary/rounds used by the UI.
 */
export async function buildWhatsappRoundReportWorkbook(
  input: ExportWhatsappRoundReportInput
) {
  const {
    summary,
    rounds,
    allGuests,
    guestsForSheets,
    invitationTitle = "",
    eventDate = null,
    clientName = null,
    selectedRoundKey = "all",
    selectedRoundTitle = null,
    generatedAt = new Date(),
  } = input;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Invistimo";
  workbook.created = new Date(generatedAt);
  workbook.modified = new Date();

  const totalGuests = Number(summary.totalGuests || allGuests.length || 0);
  const roundScopeLabel =
    selectedRoundKey && selectedRoundKey !== "all"
      ? selectedRoundTitle || selectedRoundKey
      : "כל הסבבים";

  const rsvpYes = allGuests.filter((g) => g.rsvp === "yes").length;
  const rsvpNo = allGuests.filter((g) => g.rsvp === "no").length;
  const rsvpPending = allGuests.filter(
    (g) => g.rsvp !== "yes" && g.rsvp !== "no"
  ).length;

  const missingPhone = allGuests.filter(
    (g) => !String(g.phone || "").trim()
  ).length;
  const invalidPhone = allGuests.filter((g) => {
    const phone = String(g.phone || "").trim();
    if (!phone) return false;
    return !isValidWhatsappPhone(phone);
  }).length;

  /* =========================
     1) סיכום
  ========================= */
  const summarySheet = workbook.addWorksheet("סיכום", {
    views: [{ rightToLeft: true, showGridLines: false }],
  });
  applyRtlSheet(summarySheet);
  summarySheet.columns = [
    { width: 36 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
  ];

  summarySheet.mergeCells("A1:C1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = `דוח WhatsApp – ${invitationTitle || "אירוע"}`;
  titleCell.font = { bold: true, size: 20, color: { argb: "3A2A1C" } };
  titleCell.fill = TITLE_FILL;
  titleCell.alignment = { horizontal: "right", vertical: "middle" };
  summarySheet.getRow(1).height = 34;

  const metaRows: Array<[string, string | number]> = [
    ["שם האירוע", invitationTitle || ""],
    ["תאריך האירוע", formatDateOnly(eventDate) || ""],
    ["סבב שנבחר", roundScopeLabel],
    ["תאריך ושעת הפקת הדוח", formatDateTime(generatedAt)],
    ["סה״כ אורחים", totalGuests],
  ];

  if (clientName) {
    metaRows.splice(1, 0, ["בעל אירוע / לקוח", clientName]);
  }

  let row = 3;
  for (const [label, value] of metaRows) {
    summarySheet.getCell(row, 1).value = label;
    summarySheet.getCell(row, 1).font = { bold: true, color: { argb: "7B6754" } };
    summarySheet.getCell(row, 2).value = value;
    summarySheet.getCell(row, 1).border = THIN_BORDER;
    summarySheet.getCell(row, 2).border = THIN_BORDER;
    summarySheet.getCell(row, 1).alignment = { horizontal: "right" };
    summarySheet.getCell(row, 2).alignment = { horizontal: "right" };
    row += 1;
  }

  row += 1;
  addSectionTitle(summarySheet, row, "מדדים מרכזיים (אורחים ייחודיים)", 3);
  row += 1;

  const kpiHeader = summarySheet.getRow(row);
  kpiHeader.values = ["מדד", "כמות", "אחוז"];
  styleHeaderRow(kpiHeader);
  row += 1;

  const kpiRows: Array<[string, number]> = [
    ["סה״כ אורחים", summary.totalGuests],
    ["קיבלו לפחות הודעה אחת", summary.receivedAtLeastOne],
    ["לא קיבלו אף הודעה", summary.receivedNone],
    ["נמסר לפחות פעם אחת", summary.deliveredAtLeastOnce],
    ["נקרא לפחות פעם אחת", summary.readAtLeastOnce],
    ["נכשל לפחות פעם אחת", summary.failedAtLeastOnce],
    ["ממתינים לשליחה", summary.pending],
    ["קיבלו 2+ הודעות", summary.receivedMultiple],
  ];

  for (const [label, count] of kpiRows) {
    const r = summarySheet.getRow(row);
    r.getCell(1).value = label;
    r.getCell(2).value = Number(count || 0);
    r.getCell(3).value = pct(Number(count || 0), totalGuests);
    r.getCell(3).numFmt = "0.0%";
    [1, 2, 3].forEach((col) => styleDataCell(r.getCell(col)));
    row += 1;
  }

  row += 1;
  addSectionTitle(summarySheet, row, "סיכום אישורי הגעה", 3);
  row += 1;
  const rsvpHeader = summarySheet.getRow(row);
  rsvpHeader.values = ["סטטוס", "כמות", "אחוז"];
  styleHeaderRow(rsvpHeader);
  row += 1;

  const rsvpRows: Array<[string, number]> = [
    ["אישרו", rsvpYes],
    ["לא מגיעים", rsvpNo],
    ["ממתינים לתשובה", rsvpPending],
  ];

  for (const [label, count] of rsvpRows) {
    const r = summarySheet.getRow(row);
    r.getCell(1).value = label;
    r.getCell(2).value = count;
    r.getCell(3).value = pct(count, totalGuests);
    r.getCell(3).numFmt = "0.0%";
    [1, 2, 3].forEach((col) => styleDataCell(r.getCell(col)));
    row += 1;
  }

  row += 1;
  addSectionTitle(summarySheet, row, "סיכום סבבים", 11);
  row += 1;

  const roundsHeader = summarySheet.getRow(row);
  roundsHeader.values = [
    "סבב",
    "סוג",
    "מיועדים",
    "נשלחו",
    "נמסרו",
    "נקראו",
    "נכשלו",
    "לא נשלחו",
    "ממתינים",
    "% מסירה",
    "% קריאה",
  ];
  styleHeaderRow(roundsHeader);
  row += 1;

  const roundsForTable = rounds;

  for (const round of roundsForTable) {
    const intended =
      round.intended ?? round.summary?.intended ?? round.total ?? 0;
    const sent = round.sent ?? round.summary?.sent ?? 0;
    const delivered = round.delivered ?? round.summary?.delivered ?? 0;
    const read = round.read ?? round.summary?.read ?? 0;
    const failed = round.failed ?? round.summary?.failed ?? 0;
    const notSent = round.notSent ?? round.summary?.notSent ?? 0;
    const pending = round.pending ?? round.summary?.pending ?? 0;
    // Delivery/read rates vs sent attempts (same basis as example 230/234)
    const deliveryRate = pct(delivered, sent);
    const readRate = pct(read, sent);

    const r = summarySheet.getRow(row);
    r.values = [
      round.title,
      round.typeLabel || round.type || "",
      intended,
      sent,
      delivered,
      read,
      failed,
      notSent,
      pending,
      deliveryRate,
      readRate,
    ];
    r.getCell(10).numFmt = "0.0%";
    r.getCell(11).numFmt = "0.0%";
    for (let col = 1; col <= 11; col += 1) {
      styleDataCell(r.getCell(col));
    }
    row += 1;
  }

  if (!roundsForTable.length) {
    const r = summarySheet.getRow(row);
    r.getCell(1).value = "אין סבבים להצגה";
    styleDataCell(r.getCell(1));
    row += 1;
  }

  row += 1;
  addSectionTitle(summarySheet, row, "לתשומת לב", 2);
  row += 1;

  const attentionItems: Array<[string, number]> = [
    ["אורחים לא קיבלו אף הודעה", summary.receivedNone],
    ["אורחים קיבלו יותר מהודעה אחת", summary.receivedMultiple],
    ["אורחים עם ניסיון שנכשל", summary.failedAtLeastOnce],
    ["אורחים ממתינים לשליחה", summary.pending],
    ["אורחים עם מספר טלפון חסר", missingPhone],
    ["אורחים עם מספר לא תקין", invalidPhone],
  ].filter(([, count]) => Number(count) > 0) as Array<[string, number]>;

  if (!attentionItems.length) {
    const r = summarySheet.getRow(row);
    r.getCell(1).value = "אין חריגים להצגה";
    styleDataCell(r.getCell(1));
    row += 1;
  } else {
    for (const [label, count] of attentionItems) {
      const r = summarySheet.getRow(row);
      r.getCell(1).value = `${count} ${label}`;
      r.getCell(2).value = count;
      styleDataCell(r.getCell(1));
      styleDataCell(r.getCell(2));
      row += 1;
    }
  }

  /* =========================
     2) אורחים
  ========================= */
  const guestsSheet = workbook.addWorksheet("אורחים", {
    views: [{ rightToLeft: true, showGridLines: false }],
  });
  applyRtlSheet(guestsSheet);

  const guestHeaders = [
    "מס׳",
    "שם אורח",
    "טלפון",
    "RSVP",
    "מספר הודעות",
    "מספר סבבים",
    "סבב אחרון",
    "סטטוס כללי",
    "סטטוס ניסיון אחרון",
    "נשלח לאחרונה",
    "נמסר לאחרונה",
    "נקרא לאחרונה",
    "נכשל לאחרונה",
    "נקרא אי פעם",
    "נמסר אי פעם",
    "מספר כשלים",
    "סיבת כשל אחרונה",
  ];

  guestsSheet.columns = guestHeaders.map((header, index) => ({
    header,
    key: `c${index}`,
    width: [
      6, 22, 16, 12, 12, 12, 24, 14, 16, 18, 18, 18, 18, 12, 12, 12, 36,
    ][index],
  }));

  styleHeaderRow(guestsSheet.getRow(1));
  guestsSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: guestHeaders.length },
  };
  guestsSheet.views = [
    { rightToLeft: true, showGridLines: false, state: "frozen", ySplit: 1 },
  ];

  guestsForSheets.forEach((guest, index) => {
    const messages = guest.messages || [];
    const lastSent = getLatestMessageField(messages, "sentAt");
    const lastDelivered = getLatestMessageField(messages, "deliveredAt");
    const lastRead = getLatestMessageField(messages, "readAt");
    const lastFailed = getLatestMessageField(messages, "failedAt");
    const failureReason =
      guest.lastError ||
      messages
        .slice()
        .reverse()
        .find((m) => m.errorMessage)?.errorMessage ||
      guest.notSentReason ||
      "";

    const values = [
      index + 1,
      guest.name || "",
      guest.phone || "",
      guest.rsvpLabel || guest.rsvp || "",
      Number(guest.messagesCount || 0),
      Number(guest.roundsSentCount || 0),
      guest.lastRoundTitle || "",
      guest.overallStatusLabel || "",
      guest.lastStatusLabel || "",
      formatDateTime(lastSent),
      formatDateTime(lastDelivered),
      formatDateTime(lastRead),
      formatDateTime(lastFailed),
      yesNo(Boolean(guest.everRead)),
      yesNo(Boolean(guest.everDelivered)),
      Number(guest.failedCount || 0),
      failureReason,
    ];

    const dataRow = guestsSheet.addRow(values);
    dataRow.eachCell((cell, colNumber) => {
      const statusForColor =
        colNumber === 8
          ? guest.overallStatusLabel || guest.overallStatus
          : colNumber === 9
            ? guest.lastStatusLabel || guest.lastStatus
            : undefined;
      styleDataCell(cell, {
        status: statusForColor,
        wrap: colNumber === 17,
      });
    });
  });

  /* =========================
     3) היסטוריית הודעות
  ========================= */
  const historySheet = workbook.addWorksheet("היסטוריית הודעות", {
    views: [{ rightToLeft: true, showGridLines: false }],
  });

  const historyHeaders = [
    "מס׳",
    "שם אורח",
    "טלפון",
    "RSVP",
    "סבב",
    "סוג הודעה",
    "Template",
    "Message ID",
    "ניסיון שליחה",
    "נשלח",
    "נמסר",
    "נקרא",
    "נכשל",
    "סטטוס",
    "שגיאה / סיבת כשל",
  ];

  historySheet.columns = historyHeaders.map((header, index) => ({
    header,
    key: `h${index}`,
    width: [
      6, 22, 16, 12, 24, 14, 28, 28, 18, 18, 18, 18, 18, 12, 40,
    ][index],
  }));

  styleHeaderRow(historySheet.getRow(1));
  historySheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: historyHeaders.length },
  };
  historySheet.views = [
    { rightToLeft: true, showGridLines: false, state: "frozen", ySplit: 1 },
  ];

  let historyIndex = 0;
  guestsForSheets.forEach((guest) => {
    (guest.messages || []).forEach((message) => {
      historyIndex += 1;
      const values = [
        historyIndex,
        guest.name || "",
        guest.phone || "",
        message.rsvpLabel || guest.rsvpLabel || message.rsvp || guest.rsvp || "",
        message.roundTitle || "",
        message.messageTypeLabel || "",
        message.templateName || "",
        message.messageId || "",
        formatDateTime(message.attemptedAt || message.createdAt),
        formatDateTime(message.sentAt),
        formatDateTime(message.deliveredAt),
        formatDateTime(message.readAt),
        formatDateTime(message.failedAt),
        message.statusLabel || "",
        message.errorMessage || "",
      ];

      const dataRow = historySheet.addRow(values);
      dataRow.eachCell((cell, colNumber) => {
        styleDataCell(cell, {
          status: colNumber === 14 ? message.statusLabel || message.status : undefined,
          wrap: colNumber === 15,
        });
      });
    });
  });

  if (historyIndex === 0) {
    const empty = historySheet.addRow([
      "",
      "אין היסטוריית הודעות לייצוא לפי הסינון הנוכחי",
    ]);
    styleDataCell(empty.getCell(2));
  }

  // Sheets are added in order: סיכום → אורחים → היסטוריית הודעות

  return workbook;
}

export function buildWhatsappReportFileName(input: {
  invitationTitle?: string;
  eventDate?: string | null;
  generatedAt?: string | Date;
}) {
  const eventPart = sanitizeFilePart(input.invitationTitle || "Event");
  const datePart = formatFileDate(input.eventDate || input.generatedAt || new Date());
  return `WhatsApp_Report_${eventPart}_${datePart}.xlsx`;
}
