import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  formatCallRoundDateTimeDmy,
  formatCallRoundDateTimeInput,
  parseCallRoundScheduledAt,
} from "../../lib/calls/callRoundScheduleTime";
import {
  IVR_LOCKED_FEMALE_VOICE_ID,
  IVR_LOCKED_MALE_VOICE_ID,
} from "../../lib/calls/elevenlabs";
import {
  assignIvrConfig,
  normalizeIvrAudioSubdoc,
} from "../../lib/calls/ivrConfigPersist";

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../.."
);

test("18:00 Israel is an absolute instant and displays DD/MM/YYYY HH:mm", () => {
  const summer = parseCallRoundScheduledAt("2026-07-01T18:00");
  const winter = parseCallRoundScheduledAt("2026-01-15T18:00");
  assert.ok(summer);
  assert.ok(winter);
  assert.equal(summer?.toISOString(), "2026-07-01T15:00:00.000Z");
  assert.equal(winter?.toISOString(), "2026-01-15T16:00:00.000Z");
  assert.equal(formatCallRoundDateTimeDmy(summer), "01/07/2026 18:00");
  assert.equal(formatCallRoundDateTimeDmy(winter), "15/01/2026 18:00");
  assert.equal(formatCallRoundDateTimeInput(summer), "2026-07-01T18:00");
  assert.equal(
    formatCallRoundDateTimeInput("2026-07-01T18:00"),
    "2026-07-01T18:00"
  );
});

test("audio subdocs are never persisted as undefined", () => {
  const user: { ivrConfig?: any; markModified?: (path: string) => void } = {
    ivrConfig: undefined,
  };
  assignIvrConfig(user, {
    audioMode: "self_recorded",
    eventNameAudio: undefined,
    composedIntroAudio: undefined,
    introAudio: {
      status: "ready",
      audioUrl: "https://example.com/a.webm",
      approved: false,
    },
  });
  assert.equal(typeof user.ivrConfig.eventNameAudio, "object");
  assert.equal(user.ivrConfig.eventNameAudio.status, "missing");
  assert.equal(typeof user.ivrConfig.composedIntroAudio, "object");
  assert.equal(user.ivrConfig.introAudio.status, "ready");
  assert.equal(user.ivrConfig.recordingApproval, undefined);
  assert.deepEqual(normalizeIvrAudioSubdoc(undefined), {
    status: "missing",
    approved: false,
  });
});

test("locked Dana and Roger voice ids stay in the IVR code", () => {
  assert.equal(IVR_LOCKED_FEMALE_VOICE_ID, "V0stpogHp8KBgdErUZbd");
  assert.equal(IVR_LOCKED_MALE_VOICE_ID, "CwhRBWXzGAHq8TQ4Fs17");
  const packs = readFileSync(
    path.join(root, "lib/calls/ivrAdminVoicePacks.ts"),
    "utf8"
  );
  assert.match(packs, /PACK_SEGMENTS_LOCKED/);
  assert.match(packs, /IVR_LOCKED_FEMALE_VOICE_ID/);
  assert.match(packs, /IVR_LOCKED_MALE_VOICE_ID/);
  const dialer = readFileSync(path.join(root, "lib/calls/ivrDialer.ts"), "utf8");
  assert.match(dialer, /already_attempted/);
  assert.match(dialer, /no_longer_eligible/);
  assert.match(dialer, /audioReady/);
});
