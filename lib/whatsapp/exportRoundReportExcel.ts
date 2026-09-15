import ExcelJS from "exceljs";
import { isValidWhatsappPhone } from "@/lib/whatsapp/roundReport";

/* =========================
   Types (same shape as report API / UI)
========================= */

export type ExcelReportStatus = string;

export type ExcelReportMessage = {
  id: string;
  roundTitle?: string;
  messageTypeLabel?: string;
  templateName?: string;
  status?: ExcelReportStatus;
  statusLabel?: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  failedAt?: string | null;
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
  summary: ExcelGuestSummary;
  rounds: ExcelReportRound[];
  allGuests: ExcelReportGuest[];
  guestsForSheets: ExcelReportGuest[];
  invitationTitle?: string;
  eventDate?: string | null;
  clientName?: string | null;
  selectedRoundKey?: string;
  selectedRoundTitle?: string | null;
  generatedAt?: string | Date;
};

/** ExcelJS requires AARRGGBB (8 hex chars). 6-char RGB causes Excel repair warnings. */
function argb(hex6or8: string) {
  const raw = String(hex6or8 || "")
    .replace(/^#/, "")
    .toUpperCase();
  if (/^[0-9A-F]{8}$/.test(raw)) return raw;
  if (/^[0-9A-F]{6}$/.test(raw)) return `FF${raw}`;
  return "FFFFFFFF";
}

function solidFill(hex: string): ExcelJS.Fill {
  return {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: argb(hex) },
  };
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: argb("E5DDD2") } },
  left: { style: "thin", color: { argb: argb("E5DDD2") } },
  bottom: { style: "thin", color: { argb: argb("E5DDD2") } },
  right: { style: "thin", color: { argb: argb("E5DDD2") } },
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
  return color ? solidFill(color) : undefined;
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
  const date = value
    ? value instanceof Date
      ? value
      : new Date(value)
    : new Date();
  if (Number.isNaN(date.getTime())) return "unknown-date";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function sanitizeFilePart(value: string) {
  return (
    String(value || "event")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "event"
  );
}

/** Prevent Excel formula injection on user-controlled text. */
function safeText(value: unknown) {
  const text = value == null ? "" : String(value);
  if (!text) return "";
  if (/^[=+\-@]/.test(text)) return `'${text}`;
  return text;
}

function pct(part: number, whole: number) {
  if (!whole || whole <= 0) return 0;
  return Number(part || 0) / Number(whole);
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

function styleHeaderCell(cell: ExcelJS.Cell) {
  cell.font = { bold: true, size: 11, color: { argb: argb("5F4A38") } };
  cell.fill = solidFill("F5EFE6");
  cell.alignment = { vertical: "middle", horizontal: "right", wrapText: true };
  cell.border = THIN_BORDER;
}

function styleDataCell(
  cell: ExcelJS.Cell,
  opts?: { status?: string; wrap?: boolean }
) {
  cell.border = THIN_BORDER;
  cell.alignment = {
    vertical: "middle",
    horizontal: "right",
    wrapText: Boolean(opts?.wrap),
  };
  const fill = statusFill(opts?.status);
  if (fill) cell.fill = fill;
}

function setRowValues(row: ExcelJS.Row, values: Array<string | number>) {
  // Assign via getCell to avoid ExcelJS row.values index quirks across versions.
  values.forEach((value, index) => {
    row.getCell(index + 1).value = value;
  });
}

function addSectionTitle(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  title: string,
  colSpan: number
) {
  const endCol = Math.max(1, colSpan);
  sheet.mergeCells(rowNumber, 1, rowNumber, endCol);
  const cell = sheet.getCell(rowNumber, 1);
  cell.value = safeText(title);
  cell.font = { bold: true, size: 13, color: { argb: argb("3A2A1C") } };
  cell.fill = solidFill("FFF8F0");
  cell.alignment = { horizontal: "right", vertical: "middle" };
  cell.border = THIN_BORDER;
  sheet.getRow(rowNumber).height = 24;
}

/**
 * Build a 3-sheet WhatsApp report workbook that opens cleanly in Microsoft Excel.
 * Uses the same summary/rounds/guests payload as the UI (no separate aggregation).
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
  const summarySheet = workbook.addWorksheet("סיכום");
  summarySheet.views = [{ rightToLeft: true, showGridLines: false }];
  summarySheet.columns = [
    { width: 36 },
    { width: 18 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
  ];

  summarySheet.mergeCells(1, 1, 1, 3);
  const titleCell = summarySheet.getCell(1, 1);
  titleCell.value = safeText(`דוח WhatsApp – ${invitationTitle || "אירוע"}`);
  titleCell.font = { bold: true, size: 18, color: { argb: argb("3A2A1C") } };
  titleCell.fill = solidFill("F8F1E6");
  titleCell.alignment = { horizontal: "right", vertical: "middle" };
  summarySheet.getRow(1).height = 30;

  const metaRows: Array<[string, string | number]> = [
    ["שם האירוע", safeText(invitationTitle || "")],
  ];
  if (clientName) {
    metaRows.push(["בעל אירוע / לקוח", safeText(clientName)]);
  }
  metaRows.push(
    ["תאריך האירוע", formatDateOnly(eventDate) || ""],
    ["סבב שנבחר", safeText(roundScopeLabel)],
    ["תאריך ושעת הפקת הדוח", formatDateTime(generatedAt)],
    ["סה״כ אורחים", totalGuests]
  );

  let row = 3;
  for (const [label, value] of metaRows) {
    summarySheet.getCell(row, 1).value = label;
    summarySheet.getCell(row, 1).font = {
      bold: true,
      color: { argb: argb("7B6754") },
    };
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

  setRowValues(summarySheet.getRow(row), ["מדד", "כמות", "אחוז"]);
  [1, 2, 3].forEach((col) => styleHeaderCell(summarySheet.getCell(row, col)));
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
    summarySheet.getCell(row, 1).value = label;
    summarySheet.getCell(row, 2).value = Number(count || 0);
    summarySheet.getCell(row, 3).value = pct(Number(count || 0), totalGuests);
    summarySheet.getCell(row, 3).numFmt = "0.0%";
    [1, 2, 3].forEach((col) => styleDataCell(summarySheet.getCell(row, col)));
    row += 1;
  }

  row += 1;
  addSectionTitle(summarySheet, row, "סיכום אישורי הגעה", 3);
  row += 1;
  setRowValues(summarySheet.getRow(row), ["סטטוס", "כמות", "אחוז"]);
  [1, 2, 3].forEach((col) => styleHeaderCell(summarySheet.getCell(row, col)));
  row += 1;

  for (const [label, count] of [
    ["אישרו", rsvpYes],
    ["לא מגיעים", rsvpNo],
    ["ממתינים לתשובה", rsvpPending],
  ] as Array<[string, number]>) {
    summarySheet.getCell(row, 1).value = label;
    summarySheet.getCell(row, 2).value = count;
    summarySheet.getCell(row, 3).value = pct(count, totalGuests);
    summarySheet.getCell(row, 3).numFmt = "0.0%";
    [1, 2, 3].forEach((col) => styleDataCell(summarySheet.getCell(row, col)));
    row += 1;
  }

  row += 1;
  addSectionTitle(summarySheet, row, "סיכום סבבים", 11);
  row += 1;

  const roundHeaders = [
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
  setRowValues(summarySheet.getRow(row), roundHeaders);
  for (let col = 1; col <= 11; col += 1) {
    styleHeaderCell(summarySheet.getCell(row, col));
  }
  row += 1;

  for (const round of rounds) {
    const intended =
      round.intended ?? round.summary?.intended ?? round.total ?? 0;
    const sent = round.sent ?? round.summary?.sent ?? 0;
    const delivered = round.delivered ?? round.summary?.delivered ?? 0;
    const read = round.read ?? round.summary?.read ?? 0;
    const failed = round.failed ?? round.summary?.failed ?? 0;
    const notSent = round.notSent ?? round.summary?.notSent ?? 0;
    const pending = round.pending ?? round.summary?.pending ?? 0;

    setRowValues(summarySheet.getRow(row), [
      safeText(round.title),
      safeText(round.typeLabel || round.type || ""),
      Number(intended),
      Number(sent),
      Number(delivered),
      Number(read),
      Number(failed),
      Number(notSent),
      Number(pending),
      pct(delivered, sent),
      pct(read, sent),
    ]);
    summarySheet.getCell(row, 10).numFmt = "0.0%";
    summarySheet.getCell(row, 11).numFmt = "0.0%";
    for (let col = 1; col <= 11; col += 1) {
      styleDataCell(summarySheet.getCell(row, col));
    }
    row += 1;
  }

  if (!rounds.length) {
    summarySheet.getCell(row, 1).value = "אין סבבים להצגה";
    styleDataCell(summarySheet.getCell(row, 1));
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
    summarySheet.getCell(row, 1).value = "אין חריגים להצגה";
    styleDataCell(summarySheet.getCell(row, 1));
  } else {
    for (const [label, count] of attentionItems) {
      summarySheet.getCell(row, 1).value = safeText(`${count} ${label}`);
      summarySheet.getCell(row, 2).value = count;
      styleDataCell(summarySheet.getCell(row, 1));
      styleDataCell(summarySheet.getCell(row, 2));
      row += 1;
    }
  }

  /* =========================
     2) אורחים
  ========================= */
  const guestsSheet = workbook.addWorksheet("אורחים");
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
  const guestWidths = [
    6, 22, 16, 12, 12, 12, 24, 14, 16, 18, 18, 18, 18, 12, 12, 12, 36,
  ];

  guestsSheet.columns = guestHeaders.map((header, index) => ({
    header,
    width: guestWidths[index],
  }));
  guestsSheet.views = [
    { rightToLeft: true, showGridLines: false, state: "frozen", ySplit: 1 },
  ];
  guestsSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: guestHeaders.length },
  };
  for (let col = 1; col <= guestHeaders.length; col += 1) {
    styleHeaderCell(guestsSheet.getCell(1, col));
  }

  guestsForSheets.forEach((guest, index) => {
    const messages = guest.messages || [];
    const values = [
      index + 1,
      safeText(guest.name || ""),
      safeText(guest.phone || ""),
      safeText(guest.rsvpLabel || guest.rsvp || ""),
      Number(guest.messagesCount || 0),
      Number(guest.roundsSentCount || 0),
      safeText(guest.lastRoundTitle || ""),
      safeText(guest.overallStatusLabel || ""),
      safeText(guest.lastStatusLabel || ""),
      formatDateTime(getLatestMessageField(messages, "sentAt")),
      formatDateTime(getLatestMessageField(messages, "deliveredAt")),
      formatDateTime(getLatestMessageField(messages, "readAt")),
      formatDateTime(getLatestMessageField(messages, "failedAt")),
      yesNo(Boolean(guest.everRead)),
      yesNo(Boolean(guest.everDelivered)),
      Number(guest.failedCount || 0),
      safeText(
        guest.lastError ||
          messages
            .slice()
            .reverse()
            .find((m) => m.errorMessage)?.errorMessage ||
          guest.notSentReason ||
          ""
      ),
    ];

    const dataRow = guestsSheet.addRow(values);
    dataRow.eachCell((cell, colNumber) => {
      styleDataCell(cell, {
        status:
          colNumber === 8
            ? guest.overallStatusLabel || guest.overallStatus
            : colNumber === 9
              ? guest.lastStatusLabel || guest.lastStatus
              : undefined,
        wrap: colNumber === 17,
      });
    });
  });

  /* =========================
     3) היסטוריית הודעות
  ========================= */
  const historySheet = workbook.addWorksheet("היסטוריית הודעות");
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
  const historyWidths = [
    6, 22, 16, 12, 24, 14, 28, 28, 18, 18, 18, 18, 18, 12, 40,
  ];

  historySheet.columns = historyHeaders.map((header, index) => ({
    header,
    width: historyWidths[index],
  }));
  historySheet.views = [
    { rightToLeft: true, showGridLines: false, state: "frozen", ySplit: 1 },
  ];
  historySheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: historyHeaders.length },
  };
  for (let col = 1; col <= historyHeaders.length; col += 1) {
    styleHeaderCell(historySheet.getCell(1, col));
  }

  let historyIndex = 0;
  guestsForSheets.forEach((guest) => {
    (guest.messages || []).forEach((message) => {
      historyIndex += 1;
      const dataRow = historySheet.addRow([
        historyIndex,
        safeText(guest.name || ""),
        safeText(guest.phone || ""),
        safeText(
          message.rsvpLabel || guest.rsvpLabel || message.rsvp || guest.rsvp || ""
        ),
        safeText(message.roundTitle || ""),
        safeText(message.messageTypeLabel || ""),
        safeText(message.templateName || ""),
        safeText(message.messageId || ""),
        formatDateTime(message.attemptedAt || message.createdAt),
        formatDateTime(message.sentAt),
        formatDateTime(message.deliveredAt),
        formatDateTime(message.readAt),
        formatDateTime(message.failedAt),
        safeText(message.statusLabel || ""),
        safeText(message.errorMessage || ""),
      ]);
      dataRow.eachCell((cell, colNumber) => {
        styleDataCell(cell, {
          status:
            colNumber === 14
              ? message.statusLabel || message.status
              : undefined,
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

  return workbook;
}

export function buildWhatsappReportFileName(input: {
  invitationTitle?: string;
  eventDate?: string | null;
  generatedAt?: string | Date;
}) {
  const eventPart = sanitizeFilePart(input.invitationTitle || "Event");
  const datePart = formatFileDate(
    input.eventDate || input.generatedAt || new Date()
  );
  return `WhatsApp_Report_${eventPart}_${datePart}.xlsx`;
}

export async function workbookToNodeBuffer(workbook: ExcelJS.Workbook) {
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
