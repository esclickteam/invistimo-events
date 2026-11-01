import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  getGuestChannelView,
  isWhatsappOnlyMessageType,
} from "../../lib/whatsapp/guestChannelView";

const root = path.resolve(__dirname, "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("Save The Date and the digital invitation stay WhatsApp-only in the report", () => {
  for (const roundKey of ["save_the_date:1", "invitation_only:1"]) {
    const failed = getGuestChannelView(
      [
        {
          roundKey,
          status: "failed",
          reasonText: "לא ניתן למסור למספר ב-WhatsApp",
          errorCode: "131026",
          tracked: true,
          sms: null,
        },
      ],
      roundKey
    );

    assert.equal(failed.whatsapp.status, "FAILED");
    assert.equal(failed.whatsapp.reason, "לא ניתן למסור למספר ב-WhatsApp");
    assert.equal(failed.whatsapp.errorCode, "131026");
    assert.equal(failed.sms.status, "NOT_NEEDED");
    assert.equal(failed.sms.label, "לא נדרש");
    assert.equal(isWhatsappOnlyMessageType(roundKey), true);
  }

  const pending = getGuestChannelView(
    [
      {
        roundKey: "save_the_date:1",
        status: "failed",
        tracked: true,
        sms: { status: "PENDING", reasonCode: "SMS_NOT_REQUIRED" },
      },
    ],
    "save_the_date:1"
  );
  assert.equal(pending.sms.status, "NOT_NEEDED");
});

test("RSVP, reminders, seating, and thank-you keep their SMS fallback status", () => {
  for (const roundKey of ["rsvp:1", "reminder:1", "table:1", "thankyou:1"]) {
    const view = getGuestChannelView(
      [
        {
          roundKey,
          status: "failed",
          tracked: true,
          sms: { status: "PENDING" },
        },
      ],
      roundKey
    );
    assert.equal(view.sms.status, "PENDING", roundKey);
    assert.equal(isWhatsappOnlyMessageType(roundKey), false);
  }
});

test("fallback and scheduled SMS do not open an SMS task for those two types", () => {
  const fallback = read("lib/sms/whatsappSmsFallback.ts");
  const worker = read("workers/sendScheduledSms.ts");
  const smsWorker = worker.slice(
    worker.indexOf('lockedBy: "sms-worker"'),
    worker.indexOf("export async function sendScheduledWhatsapp")
  );

  assert.match(fallback, /type:\s*\{\s*\$nin:\s*\["save_the_date", "invitation_only"\]/);
  assert.match(fallback, /SMS_NOT_REQUIRED/);
  assert.match(smsWorker, /WHATSAPP_ONLY_NO_SMS/);
  assert.doesNotMatch(
    worker.slice(worker.indexOf("export async function sendScheduledWhatsapp")),
    /WHATSAPP_ONLY_NO_SMS/
  );
  assert.match(fallback, /"rsvp", "reminder", "table", "thankyou", "custom"/);

  const report = read("app/components/WhatsappRoundsReportModal.tsx");
  assert.match(report, /const SMS_NOT_REQUIRED_LABEL = "SMS — לא נדרש"/);
  assert.match(report, /isWhatsappOnlyMessageType\(view\.roundKey\)/);
  assert.match(report, /isWhatsappOnlyMessageType\(chip\.roundKey\)/);
  assert.match(report, /isWhatsappOnlyMessageType\(delivery\.roundKey\)/);
});
