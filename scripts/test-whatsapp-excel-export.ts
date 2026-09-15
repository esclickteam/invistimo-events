/**
 * Smoke-test WhatsApp Excel export (3 sheets + KPI source of truth).
 * Run: npx tsx scripts/test-whatsapp-excel-export.ts
 */

import fs from "fs";
import path from "path";
import {
  buildWhatsappReportFileName,
  buildWhatsappRoundReportWorkbook,
} from "../lib/whatsapp/exportRoundReportExcel";

const summary = {
  totalGuests: 5,
  receivedAtLeastOne: 3,
  receivedNone: 2,
  readAtLeastOnce: 2,
  deliveredAtLeastOnce: 3,
  failedAtLeastOnce: 1,
  receivedMultiple: 1,
  pending: 0,
};

const rounds = [
  {
    key: "rsvp:1",
    title: "סבב 1 - הזמנה",
    type: "rsvp",
    typeLabel: "הזמנה / RSVP",
    round: 1,
    total: 4,
    intended: 5,
    sent: 4,
    delivered: 3,
    read: 2,
    failed: 1,
    pending: 0,
    notSent: 1,
  },
  {
    key: "rsvp:2",
    title: "סבב 2 - תזכורת אישור הגעה",
    type: "rsvp",
    typeLabel: "הזמנה / RSVP",
    round: 2,
    total: 2,
    intended: 5,
    sent: 2,
    delivered: 2,
    read: 1,
    failed: 0,
    pending: 0,
    notSent: 3,
  },
];

const guests = [
  {
    id: "1",
    name: "אורח נקרא ואז נכשל",
    phone: "0501111111",
    rsvp: "yes" as const,
    rsvpLabel: "אישר",
    messagesCount: 2,
    receivedCount: 1,
    failedCount: 1,
    pendingCount: 0,
    overallStatus: "read",
    overallStatusLabel: "נקרא",
    lastStatus: "failed",
    lastStatusLabel: "נכשל",
    lastMessageAt: "2026-08-30T19:48:00.000Z",
    lastRoundTitle: "סבב 2 - תזכורת אישור הגעה",
    everDelivered: true,
    everRead: true,
    everFailed: true,
    lastError: "Meta limit",
    roundsSentCount: 2,
    roundsTotal: 2,
    messages: [
      {
        id: "m1",
        roundTitle: "סבב 1 - הזמנה",
        messageTypeLabel: "הזמנה",
        templateName: "rsvp_invitation_media",
        status: "read",
        statusLabel: "נקרא",
        sentAt: "2026-08-28T18:30:00.000Z",
        deliveredAt: "2026-08-28T18:31:00.000Z",
        readAt: "2026-08-28T19:04:00.000Z",
        messageId: "wamid.1",
      },
      {
        id: "m2",
        roundTitle: "סבב 2 - תזכורת אישור הגעה",
        messageTypeLabel: "תזכורת",
        templateName: "rsvp_reminder_invistimo",
        status: "failed",
        statusLabel: "נכשל",
        sentAt: "2026-08-30T19:48:00.000Z",
        failedAt: "2026-08-30T19:49:00.000Z",
        errorMessage: "Meta limit",
        messageId: "wamid.2",
      },
    ],
  },
  {
    id: "2",
    name: "אורח 3 הודעות",
    phone: "0502222222",
    rsvp: "pending" as const,
    rsvpLabel: "לא ענה",
    messagesCount: 3,
    receivedCount: 3,
    failedCount: 0,
    pendingCount: 0,
    overallStatus: "read",
    overallStatusLabel: "נקרא",
    lastStatus: "read",
    lastStatusLabel: "נקרא",
    lastRoundTitle: "סבב 2 - תזכורת אישור הגעה",
    everDelivered: true,
    everRead: true,
    everFailed: false,
    roundsSentCount: 2,
    roundsTotal: 2,
    messages: [
      {
        id: "m3",
        roundTitle: "סבב 1 - הזמנה",
        messageTypeLabel: "הזמנה",
        status: "read",
        statusLabel: "נקרא",
        sentAt: "2026-08-28T18:30:00.000Z",
        deliveredAt: "2026-08-28T18:31:00.000Z",
        readAt: "2026-08-28T19:00:00.000Z",
      },
      {
        id: "m4",
        roundTitle: "סבב 1 - הזמנה",
        messageTypeLabel: "הזמנה",
        status: "read",
        statusLabel: "נקרא",
        sentAt: "2026-08-28T20:00:00.000Z",
        deliveredAt: "2026-08-28T20:01:00.000Z",
        readAt: "2026-08-28T20:05:00.000Z",
      },
      {
        id: "m5",
        roundTitle: "סבב 2 - תזכורת אישור הגעה",
        messageTypeLabel: "תזכורת",
        status: "read",
        statusLabel: "נקרא",
        sentAt: "2026-08-30T19:48:00.000Z",
        deliveredAt: "2026-08-30T19:49:00.000Z",
        readAt: "2026-08-30T21:00:00.000Z",
      },
    ],
  },
  {
    id: "3",
    name: "אורח בלי הודעות",
    phone: "",
    rsvp: "no" as const,
    rsvpLabel: "סירב",
    messagesCount: 0,
    receivedCount: 0,
    failedCount: 0,
    pendingCount: 0,
    overallStatus: "not_sent",
    overallStatusLabel: "לא נשלח",
    lastStatus: "not_sent",
    lastStatusLabel: "לא נשלח",
    notSentReason: "חסר מספר טלפון",
    everDelivered: false,
    everRead: false,
    everFailed: false,
    roundsSentCount: 0,
    roundsTotal: 2,
    messages: [],
  },
  {
    id: "4",
    name: "אורח נמסר",
    phone: "0503333333",
    rsvp: "pending" as const,
    rsvpLabel: "לא ענה",
    messagesCount: 1,
    receivedCount: 1,
    failedCount: 0,
    pendingCount: 0,
    overallStatus: "delivered",
    overallStatusLabel: "נמסר",
    lastStatus: "delivered",
    lastStatusLabel: "נמסר",
    everDelivered: true,
    everRead: false,
    everFailed: false,
    roundsSentCount: 1,
    roundsTotal: 2,
    messages: [
      {
        id: "m6",
        roundTitle: "סבב 1 - הזמנה",
        messageTypeLabel: "הזמנה",
        status: "delivered",
        statusLabel: "נמסר",
        sentAt: "2026-08-28T18:30:00.000Z",
        deliveredAt: "2026-08-28T18:31:00.000Z",
      },
    ],
  },
  {
    id: "5",
    name: "אורח מספר לא תקין",
    phone: "123",
    rsvp: "pending" as const,
    rsvpLabel: "לא ענה",
    messagesCount: 0,
    receivedCount: 0,
    failedCount: 0,
    pendingCount: 0,
    overallStatus: "not_sent",
    overallStatusLabel: "לא נשלח",
    lastStatus: "not_sent",
    lastStatusLabel: "לא נשלח",
    notSentReason: "מספר לא תקין",
    everDelivered: false,
    everRead: false,
    everFailed: false,
    roundsSentCount: 0,
    roundsTotal: 2,
    messages: [],
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
  const workbook = await buildWhatsappRoundReportWorkbook({
    summary,
    rounds,
    allGuests: guests,
    guestsForSheets: guests,
    invitationTitle: "גל קריסטל",
    eventDate: "2026-08-30",
    clientName: "גל קריסטל",
    selectedRoundKey: "all",
    generatedAt: new Date("2026-09-15T20:35:00.000Z"),
  });

  const names = workbook.worksheets.map((sheet) => sheet.name);
  assert(names.length === 3, "exactly 3 sheets");
  assert(names[0] === "סיכום", "first sheet is סיכום");
  assert(names[1] === "אורחים", "second sheet is אורחים");
  assert(names[2] === "היסטוריית הודעות", "third sheet is היסטוריית הודעות");

  const summarySheet = workbook.getWorksheet("סיכום");
  assert(summarySheet, "summary sheet exists");
  assert(
    String(summarySheet!.getCell("A1").value || "").includes("דוח WhatsApp"),
    "summary title present"
  );

  let foundReceived = false;
  summarySheet!.eachRow((row) => {
    if (String(row.getCell(1).value || "") === "קיבלו לפחות הודעה אחת") {
      foundReceived = true;
      assert(
        row.getCell(2).value === 3,
        "receivedAtLeastOne KPI = 3 unique guests"
      );
    }
  });
  assert(foundReceived, "found receivedAtLeastOne KPI row");

  // Delivery % for round 1: 3/4 = 0.75
  let foundDelivery = false;
  summarySheet!.eachRow((row) => {
    if (String(row.getCell(1).value || "") === "סבב 1 - הזמנה") {
      foundDelivery = true;
      assert(row.getCell(10).value === 0.75, "% מסירה = delivered/sent = 3/4");
      assert(row.getCell(11).value === 0.5, "% קריאה = read/sent = 2/4");
    }
  });
  assert(foundDelivery, "found round 1 delivery/read rates");

  const guestsSheet = workbook.getWorksheet("אורחים");
  assert(guestsSheet && guestsSheet.rowCount >= 6, "guests sheet has header + 5 guests");

  const historySheet = workbook.getWorksheet("היסטוריית הודעות");
  assert(
    historySheet && historySheet.rowCount >= 7,
    "history includes all message attempts"
  );

  const guestWithFail = guestsSheet!.getRow(2);
  assert(
    String(guestWithFail.getCell(8).value) === "נקרא",
    "overall status stays נקרא after later failed"
  );
  assert(
    String(guestWithFail.getCell(9).value) === "נכשל",
    "last status is נכשל"
  );

  const fileName = buildWhatsappReportFileName({
    invitationTitle: "גל קריסטל",
    eventDate: "2026-08-30",
  });
  assert(
    fileName === "WhatsApp_Report_גל-קריסטל_30-08-2026.xlsx",
    `filename sanitized: ${fileName}`
  );

  const outDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, fileName);
  await workbook.xlsx.writeFile(outPath);
  assert(fs.existsSync(outPath), `wrote sample export to ${outPath}`);

  // Scale smoke: 1000 guests
  const manyGuests = Array.from({ length: 1000 }, (_, i) => ({
    ...guests[0],
    id: `g-${i}`,
    name: `אורח ${i}`,
    messages: guests[0].messages,
  }));
  const big = await buildWhatsappRoundReportWorkbook({
    summary: { ...summary, totalGuests: 1000 },
    rounds,
    allGuests: manyGuests,
    guestsForSheets: manyGuests,
    invitationTitle: "Scale Test",
    eventDate: "2026-08-30",
  });
  assert(big.getWorksheet("אורחים")!.rowCount >= 1001, "1000+ guests export works");

  if (process.exitCode) {
    console.error("Excel export checks failed");
    process.exit(1);
  }

  console.log("All Excel export checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
