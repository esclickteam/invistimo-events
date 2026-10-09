import ExcelJS from "exceljs";

type ReportRow = {
  id: string;
  atLabel: string;
  eventName: string;
  clientName: string;
  guestName: string;
  phone: string;
  directionLabel: string;
  round: number | null;
  audioModeLabel: string;
  callStatusLabel: string;
  rsvpLabel: string;
  invitedCount: number | null;
  attendingCount: number | null;
  callDurationLabel: string;
  ringLabel: string;
  answerToPlaybackLabel: string;
  digitToFollowupLabel: string;
  digitToRsvpLabel: string;
  dialToRingLabel: string;
  attempts: number;
  error: string;
  hangupCause: string;
  hangupSource: string;
  telnyxCallControlId: string;
  telnyxCallLegId: string;
  telnyxCallSessionId: string;
  digits: string;
  choiceDigit: string;
  guestCountDigits: string;
  timeline: Array<{ atLabel: string; label: string; detail?: string }>;
};

const COLUMNS: Array<{ header: string; key: keyof ReportRow | "timelineText"; width: number }> = [
  { header: "תאריך ושעה", key: "atLabel", width: 22 },
  { header: "אירוע", key: "eventName", width: 24 },
  { header: "לקוח", key: "clientName", width: 20 },
  { header: "אורח", key: "guestName", width: 20 },
  { header: "טלפון", key: "phone", width: 16 },
  { header: "כיוון", key: "directionLabel", width: 12 },
  { header: "סבב", key: "round", width: 10 },
  { header: "סוג הקלטה", key: "audioModeLabel", width: 16 },
  { header: "סטטוס שיחה", key: "callStatusLabel", width: 24 },
  { header: "אישור הגעה", key: "rsvpLabel", width: 16 },
  { header: "מוזמנים ברשומה", key: "invitedCount", width: 16 },
  { header: "מגיעים שאושרו", key: "attendingCount", width: 16 },
  { header: "משך שיחה", key: "callDurationLabel", width: 16 },
  { header: "משך צלצול", key: "ringLabel", width: 16 },
  { header: "מענה עד השמעה", key: "answerToPlaybackLabel", width: 18 },
  { header: "הקשה עד המשך", key: "digitToFollowupLabel", width: 18 },
  { header: "הקשה עד שמירה", key: "digitToRsvpLabel", width: 18 },
  { header: "חיוג עד צלצול", key: "dialToRingLabel", width: 16 },
  { header: "ניסיונות", key: "attempts", width: 12 },
  { header: "הקשות", key: "digits", width: 16 },
  { header: "ספרת בחירה", key: "choiceDigit", width: 12 },
  { header: "ספרות כמות", key: "guestCountDigits", width: 14 },
  { header: "סיבת כישלון", key: "error", width: 28 },
  { header: "סיבת ניתוק", key: "hangupCause", width: 20 },
  { header: "מקור ניתוק", key: "hangupSource", width: 16 },
  { header: "מזהה ניסיון", key: "id", width: 26 },
  { header: "Telnyx Call Control", key: "telnyxCallControlId", width: 28 },
  { header: "Telnyx Call Leg", key: "telnyxCallLegId", width: 28 },
  { header: "Telnyx Call Session", key: "telnyxCallSessionId", width: 28 },
  { header: "ציר זמן", key: "timelineText", width: 60 },
];

export async function buildIvrCallReportWorkbook(
  rows: ReportRow[],
  truncated: boolean
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Invistimo";
  const sheet = workbook.addWorksheet("דוח שיחות", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  sheet.columns = COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  };

  for (const row of rows) {
    const timelineText = row.timeline.length
      ? row.timeline
          .map((entry) =>
            [entry.atLabel, entry.label, entry.detail].filter(Boolean).join(" — ")
          )
          .join("\n")
      : "ציר זמן אינו זמין";
    sheet.addRow({
      ...row,
      round: row.round ?? "",
      invitedCount: row.invitedCount ?? "",
      attendingCount: row.attendingCount ?? "",
      timelineText,
    });
  }

  if (truncated) {
    sheet.addRow({
      atLabel: "הייצוא הוגבל ל־20,000 השורות האחרונות התואמות למסננים",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

type UserReportRow = {
  atLabel: string;
  eventName: string;
  guestName: string;
  phone: string;
  round: number | null;
  attemptNumber: number;
  callStatusLabel: string;
  answeredLabel: string;
  choiceDigit: string;
  rsvpLabel: string;
  callDurationLabel: string;
  failureReason: string;
};

const USER_COLUMNS: Array<{
  header: string;
  key: keyof UserReportRow;
  width: number;
}> = [
  { header: "תאריך ושעה", key: "atLabel", width: 22 },
  { header: "אירוע", key: "eventName", width: 24 },
  { header: "אורח", key: "guestName", width: 22 },
  { header: "טלפון", key: "phone", width: 16 },
  { header: "סבב", key: "round", width: 10 },
  { header: "ניסיון חיוג", key: "attemptNumber", width: 14 },
  { header: "סטטוס שיחה", key: "callStatusLabel", width: 24 },
  { header: "נענתה", key: "answeredLabel", width: 12 },
  { header: "הקשה", key: "choiceDigit", width: 12 },
  { header: "תשובת הגעה", key: "rsvpLabel", width: 20 },
  { header: "משך שיחה", key: "callDurationLabel", width: 16 },
  { header: "סיבת כישלון", key: "failureReason", width: 28 },
];

export async function buildIvrUserCallReportWorkbook(
  rows: UserReportRow[],
  truncated: boolean
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Invistimo";
  const sheet = workbook.addWorksheet("דוח שיחות IVR", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  sheet.columns = USER_COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: USER_COLUMNS.length },
  };

  for (const row of rows) {
    sheet.addRow({
      ...row,
      round: row.round ?? "",
      choiceDigit: row.choiceDigit || "",
      failureReason: row.failureReason || "",
    });
  }

  if (truncated) {
    sheet.addRow({
      atLabel: "הייצוא הוגבל ל־20,000 השורות האחרונות התואמות למסננים",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
