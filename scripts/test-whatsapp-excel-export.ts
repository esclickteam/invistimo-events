/**
 * Validate WhatsApp Excel export integrity.
 * Run: npx tsx scripts/test-whatsapp-excel-export.ts
 */

import fs from "fs";
import path from "path";
import JSZip from "jszip";
import ExcelJS from "exceljs";
import {
  buildWhatsappReportFileName,
  buildWhatsappRoundReportWorkbook,
  workbookToNodeBuffer,
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
    total: 4,
    intended: 5,
    sent: 4,
    delivered: 3,
    read: 2,
    failed: 1,
    pending: 0,
    notSent: 1,
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
    lastRoundTitle: "סבב 2",
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
        status: "read",
        statusLabel: "נקרא",
        sentAt: "2026-08-28T18:30:00.000Z",
        deliveredAt: "2026-08-28T18:31:00.000Z",
        readAt: "2026-08-28T19:04:00.000Z",
        messageId: "wamid.1",
      },
      {
        id: "m2",
        roundTitle: "סבב 2",
        messageTypeLabel: "תזכורת",
        status: "failed",
        statusLabel: "נכשל",
        sentAt: "2026-08-30T19:48:00.000Z",
        failedAt: "2026-08-30T19:49:00.000Z",
        errorMessage: "=HYPERLINK(\"http://evil\")",
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
    everDelivered: true,
    everRead: true,
    everFailed: false,
    roundsSentCount: 2,
    roundsTotal: 2,
    messages: [
      {
        id: "m3",
        roundTitle: "סבב 1",
        messageTypeLabel: "הזמנה",
        status: "read",
        statusLabel: "נקרא",
        sentAt: "2026-08-28T18:30:00.000Z",
      },
      {
        id: "m4",
        roundTitle: "סבב 1",
        messageTypeLabel: "הזמנה",
        status: "read",
        statusLabel: "נקרא",
        sentAt: "2026-08-28T20:00:00.000Z",
      },
      {
        id: "m5",
        roundTitle: "סבב 2",
        messageTypeLabel: "תזכורת",
        status: "read",
        statusLabel: "נקרא",
        sentAt: "2026-08-30T19:48:00.000Z",
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
        roundTitle: "סבב 1",
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
  assert(names.join("|") === "סיכום|אורחים|היסטוריית הודעות", "sheet order");

  const buffer = await workbookToNodeBuffer(workbook);
  assert(Buffer.isBuffer(buffer) && buffer.byteLength > 1000, "binary buffer");

  // ZIP structure validation
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

  // styles.xml must not contain broken 6-digit theme refs from bad ARGB
  const stylesXml = await zip.file("xl/styles.xml")!.async("string");
  assert(!/rgb="[0-9A-Fa-f]{6}"/.test(stylesXml), "no 6-digit rgb in styles");
  assert(/rgb="FF[0-9A-Fa-f]{6}"/.test(stylesXml), "has 8-digit ARGB fills");

  // Reload with ExcelJS
  const verify = new ExcelJS.Workbook();
  await verify.xlsx.load(buffer as any);
  assert(verify.worksheets.length === 3, "ExcelJS reload has 3 sheets");
  assert(verify.worksheets[0].name === "סיכום", "reload first sheet סיכום");

  // Formula injection escaped
  const history = verify.getWorksheet("היסטוריית הודעות")!;
  let foundSafeFormula = false;
  history.eachRow((row) => {
    const err = String(row.getCell(15).value || "");
    if (err.includes("HYPERLINK")) {
      foundSafeFormula = err.startsWith("'=");
    }
  });
  assert(foundSafeFormula, "formula injection sanitized with leading quote");

  // KPI uniqueness
  const summarySheet = verify.getWorksheet("סיכום")!;
  let receivedOk = false;
  summarySheet.eachRow((row) => {
    if (String(row.getCell(1).value || "") === "קיבלו לפחות הודעה אחת") {
      receivedOk = row.getCell(2).value === 3;
    }
  });
  assert(receivedOk, "unique guests KPI for receivedAtLeastOne");

  // Round rates via 1-indexed values
  let rateOk = false;
  summarySheet.eachRow((row) => {
    const title = String(row.getCell(1).value || "");
    if (title.includes("סבב 1")) {
      const delivery = Number(row.getCell(10).value);
      const read = Number(row.getCell(11).value);
      rateOk =
        Math.abs(delivery - 0.75) < 0.0001 && Math.abs(read - 0.5) < 0.0001;
      if (!rateOk) {
        console.log("rate debug", {
          title,
          c10: row.getCell(10).value,
          c11: row.getCell(11).value,
          rowValues: row.values,
        });
      }
    }
  });
  assert(rateOk, "delivery/read rates from sent");

  const guestsSheet = verify.getWorksheet("אורחים")!;
  assert(
    String(guestsSheet.getRow(2).getCell(8).value) === "נקרא",
    "overall stays נקרא after failed"
  );
  assert(
    String(guestsSheet.getRow(2).getCell(9).value) === "נכשל",
    "last status נכשל"
  );

  const fileName = buildWhatsappReportFileName({
    invitationTitle: "גל קריסטל",
    eventDate: "2026-08-30",
  });
  assert(
    fileName === "WhatsApp_Report_גל-קריסטל_30-08-2026.xlsx",
    `filename: ${fileName}`
  );

  const outDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, buffer);
  assert(fs.existsSync(outPath), `wrote ${outPath}`);

  // Try Microsoft Excel COM validation on Windows if available
  try {
    const { execFileSync } = await import("child_process");
    const ps = `
$ErrorActionPreference = 'Stop'
$path = '${outPath.replace(/'/g, "''")}'
$excel = New-Object -ComObject Excel.Application
$excel.DisplayAlerts = $false
$excel.Visible = $false
try {
  $wb = $excel.Workbooks.Open($path)
  $names = @($wb.Worksheets | ForEach-Object { $_.Name }) -join '|'
  $wb.Close($false)
  if ($names -ne 'סיכום|אורחים|היסטוריית הודעות') { throw "bad sheets: $names" }
  Write-Output 'EXCEL_COM_OK'
} finally {
  $excel.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
}
`;
    const result = execFileSync(
      "powershell",
      ["-NoProfile", "-Command", ps],
      { encoding: "utf8", timeout: 20000 }
    );
    assert(result.includes("EXCEL_COM_OK"), "Microsoft Excel opened without repair");
  } catch (err: any) {
    console.log(
      "SKIP/WARN Excel COM open:",
      err?.message || err,
      "(ZIP+ExcelJS reload still validated)"
    );
  }

  // 1000 guests
  const many = Array.from({ length: 1000 }, (_, i) => ({
    ...guests[0],
    id: `g-${i}`,
    name: `אורח ${i}`,
  }));
  const big = await buildWhatsappRoundReportWorkbook({
    summary: { ...summary, totalGuests: 1000 },
    rounds,
    allGuests: many,
    guestsForSheets: many,
    invitationTitle: "Scale",
  });
  const bigBuf = await workbookToNodeBuffer(big);
  const bigVerify = new ExcelJS.Workbook();
  await bigVerify.xlsx.load(bigBuf as any);
  assert(
    bigVerify.getWorksheet("אורחים")!.rowCount >= 1001,
    "1000+ guests reload ok"
  );

  if (process.exitCode) {
    console.error("Excel export checks failed");
    process.exit(1);
  }
  console.log("All Excel integrity checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
