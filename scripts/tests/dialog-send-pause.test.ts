import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DIALOG_SEND_PAUSE_PHRASE,
  dialogSendPausePlan,
  dialogSendsArePaused,
  inFlightDialogSendDecision,
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
  const dialog = readFileSync("lib/whatsapp/provider/dialogProvider.ts", "utf8");
  const sendAt = dialog.indexOf("async sendTemplate");
  assert.ok(dialog.indexOf("dialogSendsArePaused()", sendAt) < dialog.indexOf("fetchImpl(MESSAGES_ENDPOINT", sendAt));
});

test("a claim made just before pause is released and does not call the provider", () => {
  assert.deepEqual(
    inFlightDialogSendDecision({ paused: true, claimed: true, requestStarted: false }),
    { callProvider: false, releaseClaim: true, blocksProviderSwitch: false }
  );
  assert.equal(
    inFlightDialogSendDecision({ paused: true, claimed: true, requestStarted: true }).blocksProviderSwitch,
    true
  );
  assert.equal(
    inFlightDialogSendDecision({ paused: false, claimed: true, requestStarted: false }).callProvider,
    true
  );

  const scheduled = readFileSync("app/api/cron/send-scheduled-sms/route.ts", "utf8");
  const queueCron = readFileSync("app/api/cron/whatsapp/route.ts", "utf8");
  const worker = readFileSync("workers/sendScheduledSms.ts", "utf8");
  assert.match(scheduled, /sendScheduledWhatsapp/);
  assert.match(queueCron, /sendScheduledWhatsapp/);
  const whatsappWorker = worker.slice(worker.indexOf("export async function sendScheduledWhatsapp"));
  const releaseAt = whatsappWorker.indexOf('status: "pending"');
  const sendAt = whatsappWorker.lastIndexOf("sendWhatsappTemplate(");
  assert.ok(releaseAt > 0 && releaseAt < sendAt);
});
