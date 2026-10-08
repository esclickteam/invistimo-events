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
import { selectFfmpegBinary } from "../../lib/calls/ivrComposeIntro";

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

test("self-recording save never writes undefined audio objects", () => {
  const stored: Record<string, unknown> = {
    eventNameAudio: { status: "ready", audioUrl: "keep-me", approved: true },
  };
  const user = {
    ivrConfig: stored,
    set(path: string, value: unknown) {
      const key = path.replace(/^ivrConfig\./, "");
      stored[key] = value;
    },
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
  assert.equal(
    (stored.eventNameAudio as { audioUrl: string }).audioUrl,
    "keep-me"
  );
  assert.equal(stored.composedIntroAudio, undefined);
  assert.equal((stored.introAudio as { status: string }).status, "ready");
  assert.equal(stored.audioMode, "self_recorded");
  assert.deepEqual(normalizeIvrAudioSubdoc(undefined), {
    status: "missing",
    approved: false,
  });
});

test("customer schedule fields are DD/MM/YYYY and HH:mm", () => {
  const ui = readFileSync(
    path.join(root, "app/components/IvrRoundsPanel.jsx"),
    "utf8"
  );
  assert.match(ui, /DD\/MM\/YYYY/);
  assert.match(ui, /HH:mm/);
  assert.equal(ui.includes('type="datetime-local"'), false);
  assert.equal(ui.includes("טעינת רשימת הקולות נכשלה"), false);
  const upload = readFileSync(
    path.join(root, "app/api/ivr/audio/upload/route.ts"),
    "utf8"
  );
  assert.match(upload, /User\.updateOne/);
  assert.equal(upload.includes("eventNameAudio"), false);
  assert.equal(upload.includes("composedIntroAudio"), false);
});

test("ffmpeg resolution skips the bundled /ROOT path", () => {
  const placeholder = "/ROOT/node_modules/ffmpeg-static/ffmpeg";
  const real = "/var/task/node_modules/ffmpeg-static/ffmpeg";
  assert.equal(
    selectFfmpegBinary([placeholder, real], (filePath) => filePath === real),
    real
  );
  assert.equal(
    selectFfmpegBinary([placeholder], () => true),
    null
  );
  const config = readFileSync(path.join(root, "next.config.ts"), "utf8");
  assert.match(config, /serverExternalPackages:\s*\[[^\]]*ffmpeg-static/);
  assert.match(config, /outputFileTracingIncludes/);
  assert.match(config, /ffmpeg-static\/ffmpeg/);
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
