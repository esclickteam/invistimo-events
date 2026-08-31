import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "path";

import {
  REMINDER_WITH_TABLE_SERVER_TEMPLATE,
  buildReminderSmsTemplateForGuest,
  shouldIncludeTableNumber,
  stripTableBlockForGuestWithoutTable,
} from "../../lib/messages/resolveReminderSmsTemplate";

const root = path.resolve(process.cwd());

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const defaultBody = REMINDER_WITH_TABLE_SERVER_TEMPLATE;

function build(guest: any, event: any = {}, body = defaultBody) {
  return buildReminderSmsTemplateForGuest({ body, event, guest });
}

test("guest with table and no special settings includes table number", () => {
  const result = build({
    tableId: "t9",
    tableName: "שולחן 9",
    tableNumber: 9,
  });

  assert.equal(result.includeTableNumber, true);
  assert.equal(result.tableName, "שולחן 9");
  assert.match(result.template, /{{tableName}}/);
  assert.match(result.template, /מספר השולחן שלך/);
});

test("guest without table gets reminder without table number", () => {
  const result = build({ name: "Dana" });

  assert.equal(result.includeTableNumber, false);
  assert.equal(result.tableName, "");
  assert.doesNotMatch(result.template, /{{tableName}}/);
  assert.doesNotMatch(result.template, /מספר השולחן שלך/);
});

test("hideTableNumberForAll hides table even when guest has a table", () => {
  const result = build(
    { tableId: "t2", tableName: "שולחן 2", tableNumber: 2 },
    { hideTableNumberForAll: true }
  );

  assert.equal(result.includeTableNumber, false);
  assert.doesNotMatch(result.template, /{{tableName}}/);
});

test("hiddenTableIds hides only matching table ids", () => {
  const hidden = { hiddenTableIds: ["1", "2", "3", "4"] };

  const atHidden = build(
    { tableId: "2", tableName: "שולחן 2", tableNumber: 2 },
    hidden
  );
  const atOther = build(
    { tableId: "8", tableName: "שולחן 8", tableNumber: 8 },
    hidden
  );

  assert.equal(atHidden.includeTableNumber, false);
  assert.equal(atOther.includeTableNumber, true);
  assert.equal(atOther.tableName, "שולחן 8");
});

test("missing event fields behave like today", () => {
  const withTable = build({ tableNumber: 5, tableName: "שולחן 5" }, undefined);
  const withoutTable = build({}, {});

  assert.equal(withTable.includeTableNumber, true);
  assert.equal(withoutTable.includeTableNumber, false);
});

test("admin body change is used as the reminder template", () => {
  const custom =
    "שלום {{name}}\nמספר השולחן שלך:\n{{tableName}}\n{{navigationLink}}";

  const result = build(
    { tableId: "t1", tableName: "שולחן 1", tableNumber: 1 },
    {},
    custom
  );

  assert.match(result.template, /שלום {{name}}/);
  assert.match(result.template, /{{tableName}}/);
});

test("scheduled then seated: send-time guest state wins", () => {
  const atSchedule = build({});
  const atSend = build({
    tableId: "t9",
    tableName: "שולחן 9",
    tableNumber: 9,
  });

  assert.equal(atSchedule.includeTableNumber, false);
  assert.equal(atSend.includeTableNumber, true);
  assert.equal(atSend.tableName, "שולחן 9");
});

test("table move before send uses the current table", () => {
  const moved = build(
    { tableId: "t8", tableName: "שולחן 8", tableNumber: 8 },
    { hiddenTableIds: ["t4"] }
  );

  assert.equal(moved.includeTableNumber, true);
  assert.equal(moved.tableName, "שולחן 8");
});

test("unseating before send removes table number", () => {
  const result = build({ tableId: null, tableName: "", tableNumber: null });
  assert.equal(result.includeTableNumber, false);
});

test("hide all then later disable restores table number", () => {
  const hidden = build(
    { tableId: "t3", tableName: "שולחן 3", tableNumber: 3 },
    { hideTableNumberForAll: true }
  );
  const restored = build(
    { tableId: "t3", tableName: "שולחן 3", tableNumber: 3 },
    { hideTableNumberForAll: false }
  );

  assert.equal(hidden.includeTableNumber, false);
  assert.equal(restored.includeTableNumber, true);
});

test("removing table from hiddenTableIds before send shows number", () => {
  const hidden = build(
    { tableId: "3", tableName: "שולחן 3", tableNumber: 3 },
    { hiddenTableIds: ["3"] }
  );
  const restored = build(
    { tableId: "3", tableName: "שולחן 3", tableNumber: 3 },
    { hiddenTableIds: [] }
  );

  assert.equal(hidden.includeTableNumber, false);
  assert.equal(restored.includeTableNumber, true);
});

test("shouldIncludeTableNumber priority: hide all first", () => {
  assert.equal(
    shouldIncludeTableNumber({
      hideTableNumberForAll: true,
      hiddenTableIds: [],
      guestTableId: "1",
      guestHasTable: true,
    }),
    false
  );
});

test("stripTableBlock removes default table section", () => {
  const stripped = stripTableBlockForGuestWithoutTable(defaultBody);
  assert.doesNotMatch(stripped, /{{tableName}}/);
  assert.doesNotMatch(stripped, /מספר השולחן שלך/);
  assert.match(stripped, /{{invitationTitle}}/);
  assert.match(stripped, /{{navigationLink}}/);
});

test("scheduled SMS worker reloads live reminder data at execution", () => {
  const worker = read("workers/sendScheduledSms.ts");

  assert.match(worker, /getReminderSmsBody\(\)/);
  assert.match(worker, /Invitation\.findById\(msg\.invitationId\)/);
  assert.match(worker, /InvitationGuest\.find\(guestsQuery\)/);
  assert.match(worker, /InvitationGuest\.findById\(guest\._id\)/);
  assert.match(worker, /Event\.findById\(reminderEventId\)/);
  assert.match(worker, /hideTableNumberForAll hiddenTableIds/);
  assert.match(worker, /buildReminderSmsTemplateForGuest/);
  assert.match(worker, /לא משתמשים ב-snapshot שנשמר בזמן התזמון/);
});

test("immediate SMS send uses the same live reminder builder", () => {
  const send = read("app/api/sms/send/route.ts");

  assert.match(send, /getReminderSmsBody\(\)/);
  assert.match(send, /buildReminderSmsTemplateForGuest/);
  assert.match(send, /Event\.findById\(reminderEventId\)/);
  assert.match(send, /const useAutoReminderByTable = isReminderSms/);
});

test("regular users cannot edit reminder body; main admin can", () => {
  const api = read("app/api/admin/reminder-sms-template/route.ts");
  const tab = read("app/dashboard/messages/new/tabs/ReminderTab.tsx");

  assert.match(api, /function isMainAdmin/);
  assert.match(api, /auth\.role === "admin"/);
  assert.match(api, /!auth\.impersonated/);
  assert.match(api, /export async function PUT/);
  assert.match(api, /FORBIDDEN/);

  assert.doesNotMatch(tab, /messageOverride=\{message\}/);
  assert.doesNotMatch(tab, /עריכת הודעה/);
  assert.match(tab, /לשלוח את הודעת התזכורת ללא מספר שולחן לכולם/);
  assert.match(tab, /הסתר מספר שולחן בשולחנות מסוימים/);
});

test("event model stores hide settings with safe defaults", () => {
  const eventModel = read("models/Event.ts");
  assert.match(eventModel, /hideTableNumberForAll/);
  assert.match(eventModel, /hiddenTableIds/);
  assert.match(eventModel, /default: false/);
});

test("deleted tables are pruned from hiddenTableIds on seating save", () => {
  const save = read("app/api/seating/save/[eventId]/route.ts");
  assert.match(save, /pruneHiddenTableIdsForEvent/);
});
