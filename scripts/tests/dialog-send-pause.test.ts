import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DIALOG_SEND_PAUSE_PHRASE,
  dialogSendPausePlan,
  dialogSendsArePaused,
} from "../../lib/whatsapp/dialogSendGate";

test("dialog sends stay open unless both pause values are set", () => {
  assert.equal(dialogSendsArePaused({}), false);
  assert.equal(
    dialogSendsArePaused({ INVISTIMO_DIALOG_SEND_PAUSED: "YES" }),
    false
  );
  assert.equal(
    dialogSendsArePaused({
      INVISTIMO_DIALOG_SEND_PAUSED: "YES",
      INVISTIMO_DIALOG_SEND_PAUSE_CONFIRM: "wrong",
    }),
    false
  );
  const armed = {
    INVISTIMO_DIALOG_SEND_PAUSED: "YES",
    INVISTIMO_DIALOG_SEND_PAUSE_CONFIRM: DIALOG_SEND_PAUSE_PHRASE,
  };
  assert.equal(dialogSendsArePaused(armed), true);
  assert.equal(dialogSendPausePlan({}).sendsContinue, true);
  assert.equal(dialogSendPausePlan(armed).paused, true);
});

test("scheduled rounds and the pending queue check the pause before they claim rows", () => {
  const worker = readFileSync("workers/sendScheduledSms.ts", "utf8");
  const scheduled = worker.slice(worker.indexOf("export async function sendScheduledWhatsapp"));
  const cron = readFileSync("app/api/cron/whatsapp/route.ts", "utf8");
  const pending = cron.slice(cron.indexOf("async function processPendingWhatsappQueue"));
  const provider = readFileSync("lib/whatsapp/provider/index.ts", "utf8");

  const workerPause = scheduled.indexOf("dialogSendsArePaused()");
  const workerClaim = scheduled.indexOf('status: "scheduled"');
  const cronPause = pending.indexOf("dialogSendsArePaused()");
  const cronClaim = pending.indexOf('status: "pending"');

  assert.ok(workerPause > 0 && workerPause < workerClaim);
  assert.ok(cronPause > 0 && cronPause < cronClaim);
  assert.match(provider, /INVISTIMO_DIALOG_SEND_PAUSED/);
  const leads = readFileSync("app/api/employee/leads/[leadId]/messages/route.ts", "utf8");
  assert.equal(leads.split("dialogSendsArePaused()").length, 3);
});
