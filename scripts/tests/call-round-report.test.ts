import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import {
  buildCallRoundReport,
  filterCallRoundRows,
  summarizeCallRoundRows,
} from "../../lib/calls/buildCallRoundReport";
import { buildCallRoundWorkbook } from "../../lib/calls/exportCallRoundReportExcel";

const started = "2026-11-18T10:00:00.000Z";
const ended = "2026-11-18T10:00:00.480Z";

test("report keeps a 480ms attempt, a task without a call, and a guest without a task", () => {
  const report = buildCallRoundReport({
    round: 1,
    guests: [
      { _id: "g1", name: "נועה", phone: "0501234567", rsvp: "pending" },
      { _id: "g2", name: "דני", phone: "0502223344", rsvp: "pending" },
      { _id: "g3", name: "חסר מספר", phone: "123", rsvp: "pending" },
    ],
    tasks: [
      {
        _id: "t1",
        guestId: "g1",
        round: 1,
        status: "pending",
        employeeName: "מיכל",
      },
      {
        _id: "t2",
        guestId: "g2",
        round: 1,
        status: "no_answer",
        result: "no_answer",
        employeeName: "מיכל",
        completedAt: started,
      },
    ],
    attempts: [
      {
        callControlId: "cc-480",
        taskId: "t1",
        startedAt: started,
        endedAt: ended,
        durationMs: 480,
        preciseDuration: true,
        outcome: "early_hangup",
        telnyxResult: "ניתוק מוקדם",
        hangupCause: "originator_cancel",
      },
    ],
    workOrders: [{ round: 1, status: "open", createdAt: started }],
  });

  const short = report.rows.find((row) => row.name === "נועה");
  assert.equal(short?.attemptCount, 1);
  assert.equal(short?.attempts[0]?.durationMs, 480);
  assert.equal(report.rows.find((row) => row.name === "דני")?.noVerifiedCall, true);
  assert.equal(report.rows.find((row) => row.name === "חסר מספר")?.noTask, true);

  const filtered = filterCallRoundRows(report.rows, { view: "nocall" });
  assert.deepEqual(filtered.map((row) => row.name), ["דני"]);
  assert.equal(summarizeCallRoundRows(filtered).neverDialed, 1);
});

test("excel export writes the six defined sheets for the filtered rows", async () => {
  const report = buildCallRoundReport({
    round: 0,
    guests: [{ _id: "g1", name: "נועה", phone: "0501234567", rsvp: "pending" }],
    tasks: [{ _id: "t1", guestId: "g1", round: 2, status: "pending", employeeName: "מיכל" }],
    attempts: [],
    workOrders: [],
  });
  const buffer = await buildCallRoundWorkbook({
    title: "בדיקה",
    metrics: summarizeCallRoundRows(report.rows),
    rows: report.rows,
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ["סיכום סבב", "כל המוזמנים", "כל ניסיונות החיוג", "חריגות", "מוזמנים ללא משימה", "ביצועי נציגות"]
  );
});
