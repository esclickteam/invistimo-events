import ExcelJS from "exceljs";
import {
  formatDurationMs,
  hangupInitiatorLabel,
} from "@/lib/calls/callAttemptPolicy";
import type { ReportAttempt, ReportGuest } from "@/lib/calls/buildCallRoundReport";

function addSheet(workbook: ExcelJS.Workbook, name: string, headers: string[], rows: Array<Array<string | number>>) {
  const sheet = workbook.addWorksheet(name);
  sheet.views = [{ rightToLeft: true }];
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) sheet.addRow(row);
  sheet.columns.forEach((column) => {
    column.width = 22;
  });
}

function attemptRow(guest: ReportGuest, attempt: ReportAttempt, index: number) {
  return [
    guest.name,
    guest.phone,
    guest.round,
    guest.employeeName,
    index + 1,
    attempt.startedAt || "",
    attempt.answeredAt || "—",
    attempt.endedAt || "—",
    formatDurationMs(attempt.durationMs, attempt.preciseDuration),
    attempt.answeredAt && attempt.startedAt
      ? formatDurationMs(Date.parse(attempt.answeredAt) - Date.parse(attempt.startedAt), attempt.preciseDuration)
      : "לא היה מענה",
    attempt.startedAt && !attempt.answeredAt ? "לא ניתן לאימות" : attempt.answeredAt && attempt.startedAt
      ? formatDurationMs(Date.parse(attempt.answeredAt) - Date.parse(attempt.startedAt), attempt.preciseDuration)
      : "לא ניתן לאימות",
    attempt.answeredAt && attempt.endedAt
      ? formatDurationMs(Date.parse(attempt.endedAt) - Date.parse(attempt.answeredAt), attempt.preciseDuration)
      : "0",
    attempt.telnyxAnswered ? "כן" : "לא",
    attempt.answerType === "human"
      ? "אדם"
      : attempt.answerType === "machine"
        ? "תא קולי"
        : attempt.telnyxAnswered
          ? "לא זוהה אם אדם"
          : "—",
    attempt.telnyxResult,
    attempt.agentResult,
    attempt.sipCode || "—",
    attempt.hangupCause || "—",
    hangupInitiatorLabel(attempt),
    attempt.outcome === "valid_no_answer" || attempt.outcome === "answered" ? "כן" : "לא",
    index < guest.attempts.length - 1 ? "כן" : "לא",
    attempt.closedTask ? "כן" : "לא",
    attempt.note || "—",
    attempt.id,
    attempt.mismatch || "—",
  ];
}

export async function buildCallRoundWorkbook(input: {
  title: string;
  metrics: Record<string, number>;
  rows: ReportGuest[];
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Invistimo";
  const metricRows = Object.entries(input.metrics).map(([key, value]) => [key, value]);
  addSheet(workbook, "סיכום סבב", ["מדד", "ערך"], [[input.title, ""], ...metricRows]);
  addSheet(
    workbook,
    "כל המוזמנים",
    ["שם", "טלפון", "RSVP", "סבב", "משימה", "נציגה", "ניסיונות", "ניסיון אחרון", "תוצאת ספק", "תוצאת סבב", "לפי האכיפה", "חריגה", "סיבת אי ביצוע"],
    input.rows.map((row) => [
      row.name,
      row.phone,
      row.rsvp,
      row.round,
      row.taskStatus,
      row.employeeName,
      row.attemptCount,
      row.lastAttemptAt,
      row.lastTelnyxResult,
      row.finalResult,
      row.enforced,
      row.exception,
      row.notDialedReason,
    ])
  );
  addSheet(
    workbook,
    "כל ניסיונות החיוג",
    ["שם", "טלפון", "סבב", "נציגה", "ניסיון", "התחלה", "מענה", "ניתוק", "משך כולל", "עד מענה", "צלצול", "דיבור", "מענה Telnyx", "סוג מענה", "תוצאת Telnyx", "תוצאת נציגה", "SIP", "סיבת ניתוק", "מי ניתק", "עמד ב-20 שניות", "ניסיון חוזר", "נסגרה", "הערה", "מזהה Telnyx", "פער"],
    input.rows.flatMap((row) => row.attempts.map((attempt, index) => attemptRow(row, attempt, index)))
  );
  addSheet(
    workbook,
    "חריגות",
    ["שם", "טלפון", "סבב", "נציגה", "סוג", "פירוט"],
    input.rows
      .filter((row) => row.exception === "כן")
      .map((row) => [
        row.name,
        row.phone,
        row.round,
        row.employeeName,
        row.noVerifiedCall ? "בלי שיחה מאומתת" : row.mismatch ? "פער ספק ונציגה" : row.notDialedReason,
        row.mismatch || row.notDialedReason,
      ])
  );
  addSheet(
    workbook,
    "מוזמנים ללא משימה",
    ["שם", "טלפון", "נוסף", "הסבב נפתח", "זכאות", "סיבה", "נוסף מאוחר", "מספר לא תקין"],
    input.rows
      .filter((row) => row.noTask)
      .map((row) => [
        row.name,
        row.phone,
        row.addedAt,
        row.roundOpenedAt,
        row.eligible,
        row.whyNoTask || "לא ניתן לאימות",
        row.late,
        row.whyNoTask === "מספר לא תקין" ? "כן" : "לא",
      ])
  );
  const byAgent = new Map<string, ReportGuest[]>();
  for (const row of input.rows) {
    if (row.employeeName === "—") continue;
    const list = byAgent.get(row.employeeName) || [];
    list.push(row);
    byAgent.set(row.employeeName, list);
  }
  addSheet(
    workbook,
    "ביצועי נציגות",
    ["נציגה", "הוקצו", "חייגה", "ניסיונות", "נענו", "לא נענו", "מתחת ל-20", "הושלמו", "פתוחות", "חריגות"],
    Array.from(byAgent.entries()).map(([name, guests]) => {
      const attempts = guests.flatMap((guest) => guest.attempts);
      return [
        name,
        guests.length,
        guests.filter((guest) => guest.attemptCount > 0).length,
        attempts.length,
        attempts.filter((attempt) => attempt.telnyxAnswered).length,
        attempts.filter((attempt) => !attempt.telnyxAnswered).length,
        attempts.filter((attempt) => attempt.outcome === "early_hangup").length,
        guests.filter((guest) => guest.enforced === "כן").length,
        guests.filter((guest) => ["פתוחה", "בטיפול"].includes(guest.taskStatus)).length,
        guests.filter((guest) => guest.exception === "כן").length,
      ];
    })
  );
  return workbook.xlsx.writeBuffer();
}
