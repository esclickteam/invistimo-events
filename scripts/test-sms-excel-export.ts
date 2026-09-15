/**
 * Validate SMS4FREE Excel export integrity.
 * Run: npx tsx scripts/test-sms-excel-export.ts
 */

import fs from "fs";
import path from "path";
import JSZip from "jszip";
import ExcelJS from "exceljs";
import {
  buildSmsReportFileName,
  buildSmsRoundReportWorkbook,
  workbookToNodeBuffer,
} from "../lib/sms4free/exportRoundReportExcel";
import {
  SMS_PROGRESS_RANK,
  applySmsReportGuestFilters,
  inferSmsNotSentReason,
  isValidSmsPhone,
} from "../lib/sms4free/roundReport";

const summary = {
  totalGuests: 6,
  receivedAtLeastOne: 3,
  receivedNone: 3,
  sentAtLeastOnce: 3,
  failedAtLeastOnce: 2,
  receivedMultiple: 1,
  pending: 1,
  scheduled: 1,
  totalSmsAttempts: 7,
};

const rounds = [
  {
    key: "sms:rsvp:1",
    title: "סבב 1 - הזמנה",
    type: "rsvp",
    typeLabel: "הזמנה / RSVP",
    total: 3,
    intended: 6,
    sent: 3,
    failed: 1,
    pending: 1,
    scheduled: 1,
    notSent: 1,
  },
];

const guests = [
  {
    id: "1",
    name: "אביב בלנה",
    phone: "0587002004",
    rsvp: "no",
    rsvpLabel: "סירב",
    messagesCount: 2,
    receivedCount: 1,
    failedCount: 1,
    pendingCount: 0,
    scheduledCount: 0,
    overallStatus: "sent",
    overallStatusLabel: "נשלח",
    lastStatus: "failed",
    lastStatusLabel: "נכשל",
    lastRoundTitle: "סבב 1 - הזמנה",
    everSent: true,
    everFailed: true,
    lastError: "timeout",
    roundsSentCount: 1,
    roundsTotal: 1,
    roundStatuses: [
      {
        roundKey: "sms:rsvp:1",
        title: "סבב 1 - הזמנה",
        status: "sent",
        statusLabel: "נשלח",
        hasMessage: true,
      },
    ],
    messages: [
      {
        id: "m1",
        roundTitle: "סבב 1 - הזמנה",
        messageTypeLabel: "הזמנה",
        status: "sent",
        statusLabel: "נשלח",
        providerStatus: "accepted",
        sentAt: "2026-09-10T15:04:00.000Z",
        attemptedAt: "2026-09-10T15:04:00.000Z",
        createdAt: "2026-09-10T15:00:00.000Z",
      },
      {
        id: "m2",
        roundTitle: "סבב 1 - הזמנה",
        messageTypeLabel: "הזמנה",
        status: "failed",
        statusLabel: "נכשל",
        failedAt: "2026-09-11T10:00:00.000Z",
        attemptedAt: "2026-09-11T10:00:00.000Z",
        errorMessage: "=HYPERLINK(\"http://evil\")",
      },
    ],
  },
  {
    id: "2",
    name: "אורח מתוזמן",
    phone: "0502222222",
    rsvp: "pending",
    rsvpLabel: "לא ענה",
    messagesCount: 1,
    receivedCount: 0,
    failedCount: 0,
    pendingCount: 0,
    scheduledCount: 1,
    overallStatus: "scheduled",
    overallStatusLabel: "מתוזמן",
    lastStatus: "scheduled",
    lastStatusLabel: "מתוזמן",
    everSent: false,
    everFailed: false,
    roundsSentCount: 0,
    roundsTotal: 1,
    roundStatuses: [
      {
        roundKey: "sms:rsvp:1",
        title: "סבב 1 - הזמנה",
        status: "scheduled",
        statusLabel: "מתוזמן",
        hasMessage: true,
      },
    ],
    messages: [
      {
        id: "m3",
        roundTitle: "סבב 1 - הזמנה",
        messageTypeLabel: "הזמנה",
        status: "scheduled",
        statusLabel: "מתוזמן",
        scheduledAt: "2026-09-20T18:00:00.000Z",
        createdAt: "2026-09-15T12:00:00.000Z",
      },
    ],
  },
  {
    id: "3",
    name: "אורח ללא SMS",
    phone: "",
    rsvp: "pending",
    rsvpLabel: "לא ענה",
    messagesCount: 0,
    receivedCount: 0,
    failedCount: 0,
    pendingCount: 0,
    overallStatus: "not_sent",
    overallStatusLabel: "לא נשלח",
    lastStatus: "not_sent",
    lastStatusLabel: "לא נשלח",
    notSentReason: "חסר מספר טלפון",
    everSent: false,
    everFailed: false,
    roundsSentCount: 0,
    roundsTotal: 1,
    roundStatuses: [
      {
        roundKey: "sms:rsvp:1",
        title: "סבב 1 - הזמנה",
        status: "not_sent",
        statusLabel: "לא נשלח",
        hasMessage: false,
        notSentReason: "חסר מספר טלפון",
      },
    ],
    messages: [],
  },
  {
    id: "4",
    name: "מספר לא תקין",
    phone: "123",
    rsvp: "yes",
    rsvpLabel: "אישר",
    messagesCount: 0,
    receivedCount: 0,
    failedCount: 0,
    pendingCount: 0,
    overallStatus: "not_sent",
    overallStatusLabel: "לא נשלח",
    lastStatus: "not_sent",
    lastStatusLabel: "לא נשלח",
    notSentReason: "מספר לא תקין",
    everSent: false,
    everFailed: false,
    roundsSentCount: 0,
    roundsTotal: 1,
    roundStatuses: [
      {
        roundKey: "sms:rsvp:1",
        title: "סבב 1 - הזמנה",
        status: "not_sent",
        statusLabel: "לא נשלח",
        hasMessage: false,
        notSentReason: "מספר לא תקין",
      },
    ],
    messages: [],
  },
  {
    id: "5",
    name: "אורח שנשלח",
    phone: "0503333333",
    rsvp: "yes",
    rsvpLabel: "אישר",
    messagesCount: 1,
    receivedCount: 1,
    failedCount: 0,
    pendingCount: 0,
    overallStatus: "sent",
    overallStatusLabel: "נשלח",
    lastStatus: "sent",
    lastStatusLabel: "נשלח",
    everSent: true,
    everFailed: false,
    roundsSentCount: 1,
    roundsTotal: 1,
    roundStatuses: [
      {
        roundKey: "sms:rsvp:1",
        title: "סבב 1 - הזמנה",
        status: "sent",
        statusLabel: "נשלח",
        hasMessage: true,
      },
    ],
    messages: [
      {
        id: "m4",
        roundTitle: "סבב 1 - הזמנה",
        messageTypeLabel: "הזמנה",
        status: "sent",
        statusLabel: "נשלח",
        sentAt: "2026-09-10T18:04:00.000Z",
      },
    ],
  },
  {
    id: "6",
    name: "אורח ממתין",
    phone: "0504444444",
    rsvp: "pending",
    rsvpLabel: "לא ענה",
    messagesCount: 1,
    receivedCount: 0,
    failedCount: 0,
    pendingCount: 1,
    overallStatus: "sending",
    overallStatusLabel: "ממתין",
    lastStatus: "sending",
    lastStatusLabel: "ממתין",
    everSent: false,
    everFailed: false,
    roundsSentCount: 0,
    roundsTotal: 1,
    roundStatuses: [
      {
        roundKey: "sms:rsvp:1",
        title: "סבב 1 - הזמנה",
        status: "sending",
        statusLabel: "ממתין",
        hasMessage: true,
      },
    ],
    messages: [
      {
        id: "m5",
        roundTitle: "סבב 1 - הזמנה",
        messageTypeLabel: "הזמנה",
        status: "sending",
        statusLabel: "ממתין",
        attemptedAt: "2026-09-15T12:00:00.000Z",
      },
    ],
  },
];

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("OK:", msg);
  }
}

async function main() {
  // Progress rank: late fail does not erase prior send
  assert(
    SMS_PROGRESS_RANK.sent > SMS_PROGRESS_RANK.failed,
    "sent ranks above failed for overall status"
  );
  assert(
    SMS_PROGRESS_RANK.sent > SMS_PROGRESS_RANK.scheduled,
    "sent ranks above scheduled"
  );

  // Phone validation
  assert(isValidSmsPhone("0587002004"), "valid IL mobile");
  assert(!isValidSmsPhone(""), "empty phone invalid");
  assert(!isValidSmsPhone("123"), "short phone invalid");

  // Not-sent reasons
  assert(
    inferSmsNotSentReason({ guest: { phone: "" } }).key === "missing_phone",
    "missing phone reason"
  );
  assert(
    inferSmsNotSentReason({ guest: { phone: "123" } }).key === "invalid_phone",
    "invalid phone reason"
  );

  // Filters: unique guests, message count, status
  const filtered2plus = applySmsReportGuestFilters(guests, {
    messageCount: "2+",
  });
  assert(filtered2plus.length === 1, "filter 2+ messages => 1 guest");

  const filteredNotSent = applySmsReportGuestFilters(guests, {
    status: "not_sent",
  });
  assert(
    filteredNotSent.every((g) => g.receivedCount === 0),
    "not_sent filter excludes received"
  );

  const filteredFailed = applySmsReportGuestFilters(guests, {
    status: "failed",
  });
  assert(filteredFailed.length >= 1, "failed filter finds guests");

  const workbook = await buildSmsRoundReportWorkbook({
    summary,
    rounds,
    allGuests: guests,
    guestsForSheets: guests,
    invitationTitle: "Gal Kristal",
    eventDate: "2026-09-15",
    clientName: "Gal",
    selectedRoundKey: "all",
    generatedAt: new Date("2026-09-15T20:35:00.000Z"),
  });

  const names = workbook.worksheets.map((sheet) => sheet.name);
  assert(names.join("|") === "סיכום|אורחים|היסטוריית הודעות", "sheet order");

  const buffer = await workbookToNodeBuffer(workbook);
  assert(Buffer.isBuffer(buffer) && buffer.byteLength > 1000, "binary buffer");

  const zip = await JSZip.loadAsync(buffer);
  for (const required of [
    "[Content_Types].xml",
    "xl/workbook.xml",
    "xl/styles.xml",
    "xl/worksheets/sheet1.xml",
    "xl/worksheets/sheet2.xml",
    "xl/worksheets/sheet3.xml",
  ]) {
    assert(Boolean(zip.file(required)), `zip contains ${required}`);
  }

  const stylesXml = await zip.file("xl/styles.xml")!.async("string");
  assert(!/rgb="[0-9A-Fa-f]{6}"/.test(stylesXml), "no 6-digit rgb in styles");
  assert(/rgb="FF[0-9A-Fa-f]{6}"/.test(stylesXml), "has 8-digit ARGB fills");

  const verify = new ExcelJS.Workbook();
  await verify.xlsx.load(buffer as any);
  assert(verify.worksheets.length === 3, "ExcelJS reload has 3 sheets");
  assert(verify.worksheets[0].name === "סיכום", "reload first sheet סיכום");

  // No "נקרא" / "נמסר" columns in SMS guests sheet
  const guestsSheet = verify.getWorksheet("אורחים")!;
  const headerRow = guestsSheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell) => headers.push(String(cell.value || "")));
  assert(!headers.some((h) => h.includes("נקרא")), "no read column");
  assert(!headers.some((h) => h.includes("נמסר")), "no delivered column");

  const history = verify.getWorksheet("היסטוריית הודעות")!;
  let foundSafeFormula = false;
  history.eachRow((row) => {
    const err = String(row.getCell(16).value || "");
    if (err.includes("HYPERLINK")) {
      foundSafeFormula = err.startsWith("'=");
    }
  });
  assert(foundSafeFormula, "formula injection sanitized with leading quote");

  const fileName = buildSmsReportFileName({
    invitationTitle: "Gal Kristal",
    eventDate: "2026-09-15",
  });
  assert(
    fileName === "SMS_Report_Gal-Kristal_15-09-2026.xlsx",
    `filename shape (${fileName})`
  );

  // Round filter export subset
  const roundOnly = applySmsReportGuestFilters(guests, {
    roundKey: "sms:rsvp:1",
    status: "sent",
  });
  assert(roundOnly.length >= 1, "round+status filter works");

  const roundWorkbook = await buildSmsRoundReportWorkbook({
    summary,
    rounds,
    allGuests: guests,
    guestsForSheets: roundOnly,
    invitationTitle: "Gal Kristal",
    selectedRoundKey: "sms:rsvp:1",
    selectedRoundTitle: "סבב 1 - הזמנה",
    generatedAt: new Date(),
  });
  const roundBuf = await workbookToNodeBuffer(roundWorkbook);
  assert(roundBuf.byteLength > 500, "filtered export buffer");

  // Large guest set (1k+)
  const bigGuests = Array.from({ length: 1200 }, (_, i) => ({
    id: `g${i}`,
    name: `אורח ${i}`,
    phone: `050${String(1000000 + i).slice(0, 7)}`,
    rsvp: i % 3 === 0 ? "yes" : i % 3 === 1 ? "no" : "pending",
    rsvpLabel: "אישר",
    messagesCount: i % 5 === 0 ? 2 : i % 4 === 0 ? 0 : 1,
    receivedCount: i % 4 === 0 ? 0 : 1,
    failedCount: 0,
    pendingCount: 0,
    overallStatus: i % 4 === 0 ? "not_sent" : "sent",
    overallStatusLabel: i % 4 === 0 ? "לא נשלח" : "נשלח",
    lastStatus: i % 4 === 0 ? "not_sent" : "sent",
    lastStatusLabel: i % 4 === 0 ? "לא נשלח" : "נשלח",
    everSent: i % 4 !== 0,
    everFailed: false,
    roundsSentCount: i % 4 === 0 ? 0 : 1,
    roundsTotal: 1,
    messages:
      i % 4 === 0
        ? []
        : [
            {
              id: `bm${i}`,
              roundTitle: "סבב 1",
              messageTypeLabel: "הזמנה",
              status: "sent",
              statusLabel: "נשלח",
              sentAt: "2026-09-10T12:00:00.000Z",
            },
          ],
  }));

  const bigSummary = {
    totalGuests: 1200,
    receivedAtLeastOne: bigGuests.filter((g) => g.receivedCount > 0).length,
    receivedNone: bigGuests.filter((g) => g.receivedCount === 0).length,
    sentAtLeastOnce: bigGuests.filter((g) => g.receivedCount > 0).length,
    failedAtLeastOnce: 0,
    pending: 0,
    scheduled: 0,
    receivedMultiple: bigGuests.filter((g) => g.messagesCount >= 2).length,
    totalSmsAttempts: bigGuests.reduce((s, g) => s + g.messagesCount, 0),
  };

  const big = await buildSmsRoundReportWorkbook({
    summary: bigSummary,
    rounds,
    allGuests: bigGuests,
    guestsForSheets: bigGuests,
    invitationTitle: "Big Event",
    generatedAt: new Date(),
  });
  const bigBuf = await workbookToNodeBuffer(big);
  assert(bigBuf.byteLength > 50_000, "1k+ guests excel size");

  const outDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, bigBuf);
  console.log("Wrote sample:", outPath);

  if (process.exitCode) {
    console.error("SMS Excel export tests FAILED");
    process.exit(1);
  }
  console.log("SMS Excel export tests PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
