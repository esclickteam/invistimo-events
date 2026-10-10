/**
 * IVR phase machine. No Telnyx calls, no database, no guest RSVP writes.
 * Proves the invalid-choice prompt cannot play before the choice window.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  initialIvrCallState,
  invalidChoiceAllowed,
  playsInvalidChoicePrompt,
  reduceIvrCall,
  type IvrCallMachineState,
  type IvrMachineCommand,
  type IvrMachineEvent,
} from "../../lib/calls/ivrCallPhase";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function apply(state: IvrCallMachineState, event: IvrMachineEvent) {
  const result = reduceIvrCall(state, event);
  return { state: result.state, commands: result.commands };
}

function commandTypes(commands: IvrMachineCommand[]) {
  return commands.map((command) => command.type);
}

function toChoiceWindow() {
  let state = initialIvrCallState();
  const answered = apply(state, { type: "answered" });
  assert.deepEqual(commandTypes(answered.commands), ["play_intro"]);
  assert.equal(playsInvalidChoicePrompt(answered.commands), false);
  state = answered.state;
  assert.equal(state.phase, "PLAYING_INTRO");
  const played = apply(state, {
    type: "playback_ended",
    stage: "intro",
    status: "completed",
    generation: state.mediaGeneration,
  });
  assert.deepEqual(commandTypes(played.commands), ["keep_gather"]);
  assert.equal(played.state.phase, "WAITING_FOR_INPUT");
  assert.equal(played.state.introCompleted, true);
  assert.equal(played.state.gatherOpen, true);
  assert.equal(played.state.audioRunning, false);
  assert.equal(invalidChoiceAllowed(played.state), true);
  return played.state;
}

function assertNoInvalid(commands: IvrMachineCommand[]) {
  assert.equal(playsInvalidChoicePrompt(commands), false);
}

test("invalid choice cannot play before the choice window", () => {
  let state = initialIvrCallState();
  const earlyEvents: IvrMachineEvent[] = [
    { type: "gather_ended", digits: "", status: "timeout", generation: 0, stage: "choice" },
    { type: "gather_ended", digits: "", status: "invalid", generation: 1, stage: "" },
    { type: "gather_ended", digits: "9", status: "valid", generation: 0, stage: "choice" },
    { type: "dtmf", digit: "1", stage: "choice" },
    { type: "playback_ended", stage: "intro", status: "completed", generation: 1 },
  ];
  for (const event of earlyEvents) {
    const step = apply(state, event);
    assertNoInvalid(step.commands);
    assert.equal(step.state.phase, "RINGING");
  }

  const answered = apply(state, { type: "answered" });
  assertNoInvalid(answered.commands);
  state = answered.state;
  const duringIntro: IvrMachineEvent[] = [
    { type: "gather_ended", digits: "", status: "timeout", generation: state.mediaGeneration, stage: "choice" },
    { type: "gather_ended", digits: "5", status: "invalid", generation: state.mediaGeneration, stage: "intro" },
    { type: "dtmf", digit: "#", stage: "intro" },
    { type: "answered" },
  ];
  for (const event of duringIntro) {
    const step = apply(state, event);
    assertNoInvalid(step.commands);
    assert.equal(step.state.phase, "PLAYING_INTRO");
    assert.equal(step.commands.some((command) => command.type === "play_intro" && event.type === "answered"), false);
  }
});

test("inbound and outbound share the answer then playback then gather order", () => {
  const state = toChoiceWindow();
  assert.equal(state.inputTarget, "choice");
  assert.equal(state.choiceDigit, "");
  assert.equal(state.rsvpApplied, false);
});

test("duplicate answer does not start a second intro", () => {
  const first = apply(initialIvrCallState(), { type: "answered" });
  const second = apply(first.state, { type: "answered" });
  assert.deepEqual(commandTypes(first.commands), ["play_intro"]);
  assert.equal(second.commands[0]?.type, "ignore");
  assert.equal(second.state.mediaGeneration, first.state.mediaGeneration);
});

test("out of order playback and gather do not open the menu early", () => {
  let state = initialIvrCallState();
  const playbackFirst = apply(state, {
    type: "playback_ended",
    stage: "intro",
    status: "completed",
    generation: 1,
  });
  assert.equal(playbackFirst.commands[0]?.type, "ignore");
  state = playbackFirst.state;
  const gatherFirst = apply(state, {
    type: "gather_ended",
    digits: "1",
    status: "valid",
    generation: 1,
    stage: "choice",
  });
  assertNoInvalid(gatherFirst.commands);
  assert.equal(gatherFirst.commands.some((command) => command.type === "apply_rsvp"), false);
  assert.equal(gatherFirst.state.phase, "RINGING");
});

test("digit 1 asks for the guest count once, then saves yes", () => {
  let state = toChoiceWindow();
  const first = apply(state, {
    type: "gather_ended",
    digits: "1",
    status: "valid",
    generation: state.mediaGeneration,
    stage: "choice",
  });
  assert.deepEqual(commandTypes(first.commands), ["play_ask_count"]);
  assert.equal(first.commands.some((command) => command.type === "apply_rsvp"), false);
  const duplicate = apply(first.state, {
    type: "gather_ended",
    digits: "1",
    status: "valid",
    generation: state.mediaGeneration,
    stage: "choice",
  });
  assert.equal(duplicate.commands[0]?.type, "ignore");
  assert.equal(duplicate.commands.some((command) => command.type === "play_ask_count"), false);

  const asked = apply(first.state, {
    type: "playback_ended",
    stage: "ask_count",
    status: "completed",
    generation: first.state.mediaGeneration,
  });
  assert.deepEqual(commandTypes(asked.commands), ["keep_gather"]);
  const count = apply(asked.state, {
    type: "gather_ended",
    digits: "4",
    status: "valid",
    generation: asked.state.mediaGeneration,
    stage: "count",
  });
  assert.equal(count.commands[0]?.type, "apply_rsvp");
  if (count.commands[0]?.type === "apply_rsvp") {
    assert.equal(count.commands[0].rsvp, "yes");
    assert.equal(count.commands[0].attendingCount, 4);
  }
  assert.equal(count.state.rsvpApplied, true);
  const again = apply(count.state, {
    type: "gather_ended",
    digits: "4",
    status: "valid",
    generation: count.state.mediaGeneration,
    stage: "count",
  });
  assert.equal(again.commands.some((command) => command.type === "apply_rsvp"), false);
});

test("digit 2 saves no and digit 3 saves maybe, each once", () => {
  for (const digit of ["2", "3"] as const) {
    const waiting = toChoiceWindow();
    const chosen = apply(waiting, {
      type: "dtmf",
      digit,
      stage: "choice",
    });
    assert.equal(chosen.commands[0]?.type, "apply_rsvp");
    if (chosen.commands[0]?.type === "apply_rsvp") {
      assert.equal(chosen.commands[0].rsvp, digit === "2" ? "no" : "maybe");
      if (digit === "2") assert.equal(chosen.commands[0].attendingCount, 0);
    }
    const replay = apply(chosen.state, {
      type: "gather_ended",
      digits: digit,
      status: "valid",
      generation: waiting.mediaGeneration,
      stage: "choice",
    });
    assert.equal(replay.commands.some((command) => command.type === "apply_rsvp"), false);
    assert.equal(replay.commands.some((command) => command.type === "play_thanks"), false);
  }
});

test("no digit and a bad digit retry only after the menu was heard", () => {
  const waiting = toChoiceWindow();
  const silent = apply(waiting, {
    type: "gather_ended",
    digits: "",
    status: "timeout",
    generation: waiting.mediaGeneration,
    stage: "choice",
  });
  assert.deepEqual(commandTypes(silent.commands), ["play_invalid_choice"]);
  const afterPrompt = apply(silent.state, {
    type: "playback_ended",
    stage: "invalid_choice",
    status: "completed",
    generation: silent.state.mediaGeneration,
  });
  assert.deepEqual(commandTypes(afterPrompt.commands), ["keep_gather"]);
  const bad = apply(afterPrompt.state, {
    type: "gather_ended",
    digits: "9",
    status: "invalid",
    generation: afterPrompt.state.mediaGeneration,
    stage: "choice",
  });
  assert.equal(bad.commands[0]?.type, "hangup_no_choice");
  assert.equal(bad.commands.some((command) => command.type === "apply_rsvp"), false);
  assert.equal(bad.state.rsvpApplied, false);
});

test("hangup during the intro or after a digit does not create an RSVP", () => {
  const intro = apply(initialIvrCallState(), { type: "answered" }).state;
  const hungDuringIntro = apply(intro, { type: "hangup" });
  assert.deepEqual(commandTypes(hungDuringIntro.commands), ["close_without_rsvp"]);
  assert.equal(hungDuringIntro.state.rsvpApplied, false);

  const waiting = toChoiceWindow();
  const hungWhileWaiting = apply(waiting, { type: "hangup" });
  assert.deepEqual(commandTypes(hungWhileWaiting.commands), ["close_without_rsvp"]);
  assert.equal(hungWhileWaiting.commands.some((command) => command.type === "apply_rsvp"), false);

  const chosen = apply(waiting, { type: "dtmf", digit: "2", stage: "choice" });
  const hungAfter = apply(chosen.state, { type: "hangup" });
  assert.equal(hungAfter.commands.some((command) => command.type === "apply_rsvp"), false);
});

test("timeout during the intro is ignored and does not play the error", () => {
  const intro = apply(initialIvrCallState(), { type: "answered" }).state;
  const timeout = apply(intro, {
    type: "gather_ended",
    digits: "",
    status: "timeout",
    generation: intro.mediaGeneration,
    stage: "choice",
  });
  assertNoInvalid(timeout.commands);
  assert.equal(timeout.state.phase, "PLAYING_INTRO");
  assert.equal(timeout.state.audioRunning, true);
  assert.equal(timeout.state.gatherOpen, true);
});

test("approved intro is gathered with the file, and the first command sends no stop", () => {
  const start = readSrc("lib/calls/ivrInboundStart.ts");
  const webhook = readSrc("lib/calls/ivrWebhookHandler.ts");
  const machine = readSrc("lib/calls/ivrCallMachine.ts");
  const phase = readSrc("lib/calls/ivrCallPhase.ts");
  const control = readSrc("lib/telnyx/ivrCallControl.ts");
  assert.equal(start.includes("gatherIvrUsingAudio"), false);
  assert.match(machine, /playIntroAudio/);
  assert.match(machine, /gatherIvrUsingAudio/);
  assert.match(machine, /"none"/);
  assert.match(machine, /release_gather/);
  assert.ok(
    machine.indexOf("const savePromise = applyRsvpOnce") <
      machine.indexOf("const thanksUrl = await thanksUrlPromise")
  );
  const save = machine.slice(
    machine.indexOf("export async function applyRsvpOnce"),
    machine.indexOf("async function claimFields")
  );
  assert.ok(save.indexOf("await applyIvrRsvpToGuest") < save.indexOf("return { applied: true }"));
  const failedThanks = save.slice(save.indexOf('promptKind: "thanks"'));
  assert.match(failedThanks, /rsvpApplied: false/);
  assert.match(failedThanks, /rsvpResult: null/);
  assert.match(machine, /gatherIvrDigits/);
  assert.match(machine, /terminatingDigit: ""/);
  assert.match(control, /release_gather/);
  assert.match(webhook, /handleIvrAnswered/);
  assert.match(webhook, /handleIvrDigits/);
  assert.match(webhook, /introCompleted/);
  assert.match(webhook, /IVR_BARGE_IN_TELNYX_MS/);
  assert.match(phase, /invalidChoiceAllowed/);
  assert.match(phase, /input_before_choice_window/);
  assert.match(phase, /hold_barge/);
  assert.match(readSrc("lib/calls/ivrDialer.ts"), /phase: allowed \? "RINGING"/);
  assert.match(readSrc("app/components/IvrRoundsPanel.jsx"), /composedIntroAudioUrl/);
});
