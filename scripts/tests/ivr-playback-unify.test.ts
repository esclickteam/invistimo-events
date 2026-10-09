/**
 * Unified IVR player: one composed file, no mid-call legacy switch,
 * stale Telnyx events cannot advance stages. No live dials.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  initialIvrCallState,
  invalidChoiceAllowed,
  playsInvalidChoicePrompt,
  reduceIvrCall,
  type IvrCallMachineState,
  type IvrMachineEvent,
} from "../../lib/calls/ivrCallPhase";

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../.."
);

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function apply(state: IvrCallMachineState, event: IvrMachineEvent) {
  return reduceIvrCall(state, event);
}

function toChoiceWindow() {
  let state = initialIvrCallState();
  state = apply(state, { type: "answered" }).state;
  return apply(state, {
    type: "playback_ended",
    stage: "intro",
    status: "completed",
    generation: state.mediaGeneration,
  }).state;
}

test("preview prefers the single composed file Telnyx plays", () => {
  const panel = readSrc("app/components/IvrRoundsPanel.jsx");
  assert.match(panel, /composedIntroAudioUrl/);
  assert.match(panel, /אותו קובץ מחובר/);
  assert.match(panel, /seamless/);
  // Must not prefer the 3-clip stitch when composed exists.
  const playlistFn = panel.slice(
    panel.indexOf("const previewPlaylist = useMemo"),
    panel.indexOf("const composedReady")
  );
  assert.match(playlistFn, /composedUrl/);
  assert.match(playlistFn, /return \[composedUrl\]/);
});

test("inbound and outbound answers share the phase machine", () => {
  const webhook = readSrc("lib/calls/ivrWebhookHandler.ts");
  const machine = readSrc("lib/calls/ivrCallMachine.ts");
  assert.match(webhook, /isLegacyInFlight/);
  assert.match(webhook, /handleIvrAnswered/);
  assert.match(machine, /export function isLegacyInFlight/);
  assert.match(machine, /playbackIvrAudio/);
  assert.match(machine, /gatherIvrDigits/);
  // Fresh answers must not fall into gather_using_audio intro path.
  const answerCase = webhook.slice(
    webhook.indexOf('case "call.answered"'),
    webhook.indexOf('case "call.dtmf.received"')
  );
  assert.match(answerCase, /!isLegacyInFlight/);
  assert.match(answerCase, /handleIvrAnswered/);
});

test("stale playback.ended with wrong or missing generation is ignored", () => {
  let state = initialIvrCallState();
  state = apply(state, { type: "answered" }).state;
  assert.equal(state.phase, "PLAYING_INTRO");
  assert.ok(state.mediaGeneration > 0);

  const late = apply(state, {
    type: "playback_ended",
    stage: "intro",
    status: "completed",
    generation: state.mediaGeneration - 1,
  });
  assert.equal(late.commands[0]?.type, "ignore");
  assert.equal(late.state.phase, "PLAYING_INTRO");

  const missing = apply(state, {
    type: "playback_ended",
    stage: "intro",
    status: "completed",
    generation: 0,
  });
  assert.equal(missing.commands[0]?.type, "ignore");
  assert.equal(missing.state.phase, "PLAYING_INTRO");
});

test("duplicate gather.ended after digit cannot replay RSVP", () => {
  const waiting = toChoiceWindow();
  const first = apply(waiting, {
    type: "gather_ended",
    digits: "2",
    status: "valid",
    generation: waiting.mediaGeneration,
    stage: "choice",
  });
  assert.equal(first.commands.some((c) => c.type === "apply_rsvp"), true);
  const dup = apply(first.state, {
    type: "gather_ended",
    digits: "2",
    status: "valid",
    generation: waiting.mediaGeneration,
    stage: "choice",
  });
  assert.equal(dup.commands.some((c) => c.type === "apply_rsvp"), false);
  assert.equal(dup.commands.some((c) => c.type === "play_thanks"), false);
});

test("gather timeout without digit cannot fire invalid choice during intro", () => {
  let state = initialIvrCallState();
  state = apply(state, { type: "answered" }).state;
  const early = apply(state, {
    type: "gather_ended",
    digits: "",
    status: "timeout",
    generation: state.mediaGeneration,
    stage: "choice",
  });
  assert.equal(playsInvalidChoicePrompt(early.commands), false);
  assert.equal(invalidChoiceAllowed(state), false);
  assert.equal(early.state.phase, "PLAYING_INTRO");
});

test("gather timeout after menu may play invalid choice once", () => {
  const waiting = toChoiceWindow();
  assert.equal(invalidChoiceAllowed(waiting), true);
  const silent = apply(waiting, {
    type: "gather_ended",
    digits: "",
    status: "timeout",
    generation: waiting.mediaGeneration,
    stage: "choice",
  });
  assert.deepEqual(
    silent.commands.map((c) => c.type),
    ["play_invalid_choice"]
  );
});

test("digit during stage transition to ask_count is ignored as duplicate", () => {
  const waiting = toChoiceWindow();
  const first = apply(waiting, {
    type: "dtmf",
    digit: "1",
    stage: "choice",
  });
  assert.equal(first.commands[0]?.type, "play_ask_count");
  const duringAsk = apply(first.state, {
    type: "dtmf",
    digit: "1",
    stage: "choice",
  });
  assert.equal(duringAsk.commands[0]?.type, "ignore");
});

test("original tree digits 1/2/3 unchanged", () => {
  const waiting = toChoiceWindow();
  const one = apply(waiting, {
    type: "gather_ended",
    digits: "1",
    status: "valid",
    generation: waiting.mediaGeneration,
    stage: "choice",
  });
  assert.equal(one.commands[0]?.type, "play_ask_count");

  for (const digit of ["2", "3"] as const) {
    const step = apply(waiting, { type: "dtmf", digit, stage: "choice" });
    assert.equal(step.commands[0]?.type, "apply_rsvp");
    if (step.commands[0]?.type === "apply_rsvp") {
      assert.equal(step.commands[0].rsvp, digit === "2" ? "no" : "maybe");
    }
  }
});

test("media helpers clear the slot before the next clip", () => {
  const control = readSrc("lib/telnyx/ivrCallControl.ts");
  const playback = control.slice(control.indexOf("export async function playbackIvrAudio"));
  assert.match(playback, /clearIvrMediaSlot/);
  const gatherAudio = control.slice(
    control.indexOf("export async function gatherIvrUsingAudio")
  );
  assert.match(gatherAudio, /clearIvrMediaSlot/);
  assert.match(gatherAudio, /timeout_millis: input\.timeoutMillis \?\? 45000/);
});

test("legacy invalid-choice path blocked while intro flow steps run", () => {
  const webhook = readSrc("lib/calls/ivrWebhookHandler.ts");
  assert.match(webhook, /introStillPlaying/);
  assert.match(webhook, /gather_choice/);
  assert.match(webhook, /playing_intro_before/);
});
