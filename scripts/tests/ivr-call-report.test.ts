import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  classifyIvrAttempt,
  formatIvrDuration,
  formatIvrIsraelDateTime,
  ivrAttemptTimings,
  ivrAudioModeLabel,
  ivrDialAttemptNumber,
  ivrStoredRsvpLabel,
  parseIvrReportDayRange,
  redactIvrReportText,
  shapeUserIvrSummary,
} from "../../lib/calls/ivrCallReport";
import { describeIvrTelnyxEvent } from "../../lib/calls/ivrCallTimeline";

const root = path.resolve(__dirname, "../..");

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

test("unanswered hangup is not labeled as answered-and-hung-up", () => {
  const classified = classifyIvrAttempt({
    status: "hangup_before_response",
    answered: false,
    endedAt: new Date(),
  });
  assert.equal(classified.callStatus, "no_answer");
  assert.equal(classified.label, "לא ענה");
  assert.equal(classified.rsvpLabel, "אין תשובה");
});

test("answered without a digit is not an RSVP", () => {
  const classified = classifyIvrAttempt({
    status: "hangup_before_response",
    answered: true,
    choiceDigit: "",
    rsvpApplied: false,
    endedAt: new Date(),
  });
  assert.equal(classified.callStatus, "answered_no_digit");
  assert.equal(classified.label, "נענה – ללא הקשה");
  assert.equal(classified.rsvpLabel, "אין תשובה");
});

test("press 1 without a count is a partial answer", () => {
  const classified = classifyIvrAttempt({
    status: "hangup_before_response",
    answered: true,
    choiceDigit: "1",
    rsvpApplied: false,
    endedAt: new Date(),
  });
  assert.equal(classified.callStatus, "partial");
  assert.equal(classified.label, "נענה – תשובה חלקית");
});

test("completed RSVP statuses stay distinct from merely answering", () => {
  assert.equal(
    classifyIvrAttempt({
      status: "completed",
      answered: true,
      rsvpApplied: true,
      rsvpResult: "yes",
      attendingCount: 4,
      endedAt: new Date(),
    } as any).label,
    "אישר הגעה"
  );
  assert.equal(
    classifyIvrAttempt({
      answered: true,
      rsvpApplied: true,
      rsvpResult: "no",
      endedAt: new Date(),
    }).label,
    "לא מגיע"
  );
  assert.equal(
    classifyIvrAttempt({
      answered: true,
      rsvpApplied: true,
      rsvpResult: "maybe",
      endedAt: new Date(),
    }).label,
    "מתלבט"
  );
});

test("blocked and failed keep their stored reasons", () => {
  assert.equal(
    classifyIvrAttempt({ status: "canceled", answered: false }).label,
    "בוטל / נחסם"
  );
  assert.equal(
    classifyIvrAttempt({ status: "failed", answered: false, error: "DIAL_FAILED" })
      .label,
    "נכשל"
  );
  assert.equal(
    classifyIvrAttempt({ status: "busy", answered: false, endedAt: new Date() })
      .label,
    "תפוס"
  );
});

test("playback latency is unavailable until Telnyx confirms playback start", () => {
  const missing = ivrAttemptTimings({
    answeredAt: "2026-07-01T15:00:00.000Z",
    playbackStartedAt: null,
    firstDigitAt: "2026-07-01T15:00:08.000Z",
    followupPlaybackStartedAt: null,
  });
  assert.equal(missing.answerToPlaybackMs, null);
  assert.equal(missing.digitToFollowupMs, null);
  assert.equal(formatIvrDuration(missing.answerToPlaybackMs), "לא זמין");

  const measured = ivrAttemptTimings({
    dialRequestedAt: "2026-07-01T15:00:00.000Z",
    ringingAt: "2026-07-01T15:00:01.200Z",
    answeredAt: "2026-07-01T15:00:05.000Z",
    playbackStartedAt: "2026-07-01T15:00:05.400Z",
    firstDigitAt: "2026-07-01T15:00:13.000Z",
    followupPlaybackStartedAt: "2026-07-01T15:00:13.300Z",
    choiceDigitAt: "2026-07-01T15:00:13.000Z",
    rsvpAppliedAt: "2026-07-01T15:00:16.200Z",
    endedAt: "2026-07-01T15:00:21.000Z",
    answered: true,
  });
  assert.equal(measured.dialToRingMs, 1200);
  assert.equal(measured.answerToPlaybackMs, 400);
  assert.equal(measured.digitToFollowupMs, 300);
  assert.equal(measured.digitToRsvpMs, 3200);
  assert.equal(formatIvrDuration(400), "400 ms");
});

test("Israel timestamps include seconds", () => {
  const label = formatIvrIsraelDateTime("2026-07-01T15:00:05.400Z");
  assert.match(label, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
  assert.equal(label, "01/07/2026 18:00:05");
  const winter = formatIvrIsraelDateTime("2026-01-15T16:00:09.000Z");
  assert.equal(winter, "15/01/2026 18:00:09");
});

test("report day range is an Israel calendar day", () => {
  const range = parseIvrReportDayRange("01/07/2026", "01/07/2026");
  assert.equal(range.start?.toISOString(), "2026-06-30T21:00:00.000Z");
  assert.equal(range.end?.toISOString(), "2026-07-01T21:00:00.000Z");
});

test("audio mode and secrets stay explicit", () => {
  assert.equal(ivrAudioModeLabel({ audioMode: "ai" }), "קריינות AI");
  assert.equal(
    ivrAudioModeLabel({ audioMode: "self_recorded" }),
    "הקלטה אישית"
  );
  assert.equal(ivrAudioModeLabel({}), "לא זמין");
  assert.equal(
    redactIvrReportText("Bearer secret-token sk_live_abc"),
    "Bearer [redacted] [redacted]"
  );
});

test("Telnyx event labels are only the received event", () => {
  assert.equal(
    describeIvrTelnyxEvent("call.playback.started", {}).label,
    "התחילה השמעה"
  );
  assert.equal(
    describeIvrTelnyxEvent("call.dtmf.received", { digit: "1" }).label,
    "נקלטה הקשה 1"
  );
  assert.equal(
    describeIvrTelnyxEvent("call.hangup", {
      hangup_cause: "normal_clearing",
      hangup_source: "callee",
    }).detail,
    "cause=normal_clearing source=callee"
  );
});

test("RSVP label follows the digit stored on that attempt", () => {
  assert.equal(
    ivrStoredRsvpLabel({
      choiceDigit: "2",
      rsvpApplied: true,
      rsvpResult: "no",
      answered: true,
      endedAt: new Date(),
    }),
    "לא מגיע"
  );
  assert.equal(
    ivrStoredRsvpLabel({
      choiceDigit: "2",
      rsvpApplied: true,
      rsvpResult: "yes",
      answered: true,
      endedAt: new Date(),
    }),
    "לא מגיע"
  );
  assert.equal(
    ivrStoredRsvpLabel({
      choiceDigit: "3",
      answered: true,
      endedAt: new Date(),
    }),
    "מתלבט"
  );
  assert.equal(
    ivrStoredRsvpLabel({
      choiceDigit: "1",
      rsvpApplied: true,
      rsvpResult: "yes",
      answered: true,
      endedAt: new Date(),
    }),
    "אישר הגעה"
  );
  assert.equal(
    ivrStoredRsvpLabel({
      choiceDigit: "1",
      rsvpApplied: false,
      answered: true,
      endedAt: new Date(),
    }),
    "אין תשובה סופית"
  );
  assert.equal(
    ivrStoredRsvpLabel({
      answered: true,
      choiceDigit: "",
      endedAt: new Date(),
    }),
    "אין תשובה סופית"
  );
});

test("user summary does not count an answered hangup as unanswered", () => {
  const summary = shapeUserIvrSummary({
    attempts: 4,
    uniqueGuests: 3,
    answered: 2,
    noAnswer: 1,
    busy: 1,
    voicemail: 0,
    failed: 0,
    answeredNoResponse: 1,
    partial: 0,
    answeredHangup: 0,
    yes: 1,
    no: 0,
    maybe: 0,
    answerRate: 0.5,
    avgCallMs: 12000,
  });
  assert.equal(summary.unanswered, 2);
  assert.equal(summary.hungUpWithoutChoice, 1);
  assert.equal(summary.noFinalAnswer, 1);
  assert.equal(summary.answerRateLabel, "50%");
  assert.equal(ivrDialAttemptNumber({ retryCount: 0 }), 1);
  assert.equal(ivrDialAttemptNumber({ retryCount: 2 }), 3);
});

test("IVR report lives on the user being edited, not the shared calls tab", () => {
  const page = readSrc("app/admin/recorded-calls/page.tsx");
  const users = readSrc("app/admin/users/page.tsx");
  const route = readSrc("app/api/admin/users/[id]/ivr-call-report/route.ts");
  const legacy = readSrc("app/api/admin/ivr/call-report/route.ts");
  const webhook = readSrc("lib/calls/ivrWebhookHandler.ts");
  const control = readSrc("lib/telnyx/ivrCallControl.ts");
  const dialer = readSrc("lib/calls/ivrDialer.ts");
  assert.match(page, /הגדרות קריינות/);
  assert.match(page, /קול נשי/);
  assert.match(page, /קול גברי/);
  assert.equal(page.includes("דוח שיחות"), false);
  assert.equal(page.includes("IvrCallReportPanel"), false);
  assert.match(users, /📊 דוח WhatsApp לסבבים/);
  assert.match(users, /📊 דוח SMS לסבבים/);
  assert.match(users, /📊 דוח שיחות IVR/);
  assert.match(users, /IvrCallsReportModal/);
  assert.match(route, /role\) !== "admin"/);
  assert.match(route, /format"\) === "xlsx"/);
  assert.match(route, /listUserIvrReportPage/);
  assert.match(legacy, /USER_REQUIRED/);
  assert.match(legacy, /listUserIvrReportExport/);
  assert.match(webhook, /pushIvrTimeline/);
  assert.match(webhook, /call\.playback\.started|playbackStartedAt/);
  assert.match(control, /notePlaybackCommand/);
  assert.equal(webhook.includes("OUTBOUND_ANSWER_DELAY_MS"), false);
  assert.match(dialer, /IvrCallAttempt\.create/);
});
