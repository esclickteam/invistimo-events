/**
 * Barge-in on the production phase machine. No Telnyx calls and no RSVP writes.
 * A valid key during narration is held until playback ends, then the existing
 * next step starts. call.gather.ended is not required for that step.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  initialIvrCallState,
  playsInvalidChoicePrompt,
  reduceIvrCall,
  type IvrCallMachineState,
  type IvrMachineEvent,
} from "../../lib/calls/ivrCallPhase";
import { ivrBargeLatency } from "../../lib/calls/ivrBargeTiming";

function apply(state: IvrCallMachineState, event: IvrMachineEvent) {
  return reduceIvrCall(state, event);
}

function types(commands: { type: string }[]) {
  return commands.map((command) => command.type);
}

function introPlaying() {
  const answered = apply(initialIvrCallState(), { type: "answered" });
  assert.deepEqual(types(answered.commands), ["play_intro"]);
  assert.equal(answered.state.audioRunning, true);
  assert.equal(answered.state.gatherOpen, true);
  assert.equal(answered.state.promptKind, "intro");
  return answered.state;
}

function pressDuringIntro(digit: "1" | "2" | "3") {
  const playing = introPlaying();
  const held = apply(playing, { type: "dtmf", digit, stage: "intro" });
  assert.deepEqual(types(held.commands), ["hold_barge"]);
  assert.equal(held.state.phase, "PLAYING_INTRO");
  assert.equal(held.state.pendingChoice, digit);
  assert.equal(held.state.choiceDigit, "");
  assert.equal(held.state.rsvpApplied, false);
  assert.equal(playsInvalidChoicePrompt(held.commands), false);
  const lateGather = apply(held.state, {
    type: "gather_ended",
    digits: digit,
    status: "valid",
    generation: held.state.mediaGeneration,
    stage: "intro",
  });
  assert.equal(lateGather.commands[0]?.type, "ignore");
  assert.equal(lateGather.state.rsvpApplied, false);
  const stopped = apply(held.state, {
    type: "playback_ended",
    stage: "intro",
    status: "completed",
    generation: held.state.mediaGeneration,
  });
  return { playing, held, stopped };
}

test("digits 1, 2 and 3 commit on playback end, not on gather end", () => {
  const one = pressDuringIntro("1");
  assert.deepEqual(types(one.stopped.commands), ["play_ask_count"]);
  assert.equal(one.stopped.commands[0]?.type === "play_ask_count" && one.stopped.commands[0].mediaSlot, "release_gather");
  assert.equal(one.stopped.state.choiceDigit, "1");
  assert.equal(one.stopped.state.rsvpApplied, false);

  for (const digit of ["2", "3"] as const) {
    const step = pressDuringIntro(digit);
    assert.deepEqual(types(step.stopped.commands), ["apply_rsvp", "play_thanks"]);
    const applyRsvp = step.stopped.commands[0];
    const play = step.stopped.commands[1];
    assert.equal(applyRsvp?.type, "apply_rsvp");
    if (applyRsvp?.type === "apply_rsvp") {
      assert.equal(applyRsvp.rsvp, digit === "2" ? "no" : "maybe");
      if (digit === "2") assert.equal(applyRsvp.attendingCount, 0);
    }
    assert.equal(play?.type, "play_thanks");
    if (play?.type === "play_thanks") assert.equal(play.mediaSlot, "release_gather");
    const again = apply(step.stopped.state, {
      type: "gather_ended",
      digits: digit,
      status: "valid",
      generation: step.held.state.mediaGeneration,
      stage: "intro",
    });
    assert.equal(again.commands.some((command) => command.type === "apply_rsvp"), false);
    assert.equal(again.commands.some((command) => command.type === "play_thanks"), false);
  }
});

test("a cancelled playback still releases a held digit once", () => {
  const playing = introPlaying();
  const held = apply(playing, { type: "dtmf", digit: "2", stage: "intro" }).state;
  const stopped = apply(held, {
    type: "playback_ended",
    stage: "intro",
    status: "cancelled",
    generation: held.mediaGeneration,
  });
  assert.equal(stopped.commands[0]?.type, "apply_rsvp");
  assert.equal(stopped.commands.some((command) => command.type === "play_invalid_choice"), false);
});

test("no digit lets the intro finish and keeps the same gather", () => {
  const playing = introPlaying();
  const ended = apply(playing, {
    type: "playback_ended",
    stage: "intro",
    status: "completed",
    generation: playing.mediaGeneration,
  });
  assert.deepEqual(types(ended.commands), ["keep_gather"]);
  assert.equal(ended.state.phase, "WAITING_FOR_INPUT");
  assert.equal(ended.state.audioRunning, false);
  assert.equal(ended.state.gatherOpen, true);
  assert.equal(playsInvalidChoicePrompt(ended.commands), false);
});

test("an invalid digit does not play the error just because audio stopped", () => {
  const playing = introPlaying();
  const ignored = apply(playing, { type: "dtmf", digit: "9", stage: "intro" });
  assert.equal(ignored.commands[0]?.type, "ignore");
  assert.equal(playsInvalidChoicePrompt(ignored.commands), false);
  const ended = apply(playing, {
    type: "playback_ended",
    stage: "intro",
    status: "completed",
    generation: playing.mediaGeneration,
  });
  assert.equal(playsInvalidChoicePrompt(ended.commands), false);
  const bad = apply(ended.state, {
    type: "gather_ended",
    digits: "9",
    status: "invalid",
    generation: ended.state.mediaGeneration,
    stage: "intro",
  });
  assert.equal(bad.commands[0]?.type, "play_invalid_choice");
});

test("count digits during the prompt do not save a partial, including two digits", () => {
  const menu = pressDuringIntro("1").stopped.state;
  const firstDigit = apply(menu, { type: "dtmf", digit: "1", stage: "ask_count" });
  const secondDigit = apply(menu, { type: "dtmf", digit: "2", stage: "ask_count" });
  assert.equal(firstDigit.commands[0]?.type, "ignore");
  assert.equal(secondDigit.commands[0]?.type, "ignore");
  assert.equal(firstDigit.commands.some((command) => command.type === "apply_rsvp"), false);

  const earlyGather = apply(menu, {
    type: "gather_ended",
    digits: "12",
    status: "valid",
    generation: menu.mediaGeneration,
    stage: "ask_count",
  });
  assert.deepEqual(types(earlyGather.commands), ["hold_barge"]);
  assert.equal(earlyGather.state.heldCount, 12);
  assert.equal(earlyGather.state.rsvpApplied, false);

  const thanks = apply(earlyGather.state, {
    type: "playback_ended",
    stage: "ask_count",
    status: "completed",
    generation: menu.mediaGeneration,
  });
  assert.equal(thanks.commands[0]?.type, "apply_rsvp");
  if (thanks.commands[0]?.type === "apply_rsvp") {
    assert.equal(thanks.commands[0].rsvp, "yes");
    assert.equal(thanks.commands[0].attendingCount, 12);
  }
  const duplicate = apply(thanks.state, {
    type: "gather_ended",
    digits: "12",
    status: "valid",
    generation: menu.mediaGeneration,
    stage: "ask_count",
  });
  assert.equal(duplicate.commands.some((command) => command.type === "apply_rsvp"), false);
});

test("a finished count prompt plays thanks from the gather result, including hash input", () => {
  const menu = pressDuringIntro("1").stopped.state;
  const heard = apply(menu, {
    type: "playback_ended",
    stage: "ask_count",
    status: "completed",
    generation: menu.mediaGeneration,
  });
  assert.deepEqual(types(heard.commands), ["keep_gather"]);
  const counted = apply(heard.state, {
    type: "gather_ended",
    digits: "12#",
    status: "valid",
    generation: heard.state.mediaGeneration,
    stage: "ask_count",
  });
  assert.equal(counted.commands[0]?.type, "apply_rsvp");
  if (counted.commands[0]?.type === "apply_rsvp") {
    assert.equal(counted.commands[0].attendingCount, 12);
  }
  if (counted.commands[1]?.type === "play_thanks") {
    assert.equal(counted.commands[1].mediaSlot, "none");
  }
});

test("Telnyx occurred_at latency flags overlap and ignores server delay", () => {
  const digitAt = new Date("2026-10-10T10:00:00.000Z");
  const stoppedAt = new Date("2026-10-10T10:00:00.180Z");
  const followUpAt = new Date("2026-10-10T10:00:00.260Z");
  const sample = ivrBargeLatency({ digitAt, stoppedAt, followUpAt });
  assert.equal(sample.stopMs, 180);
  assert.equal(sample.followUpMs, 260);
  assert.equal(sample.overlap, false);

  const overlapped = ivrBargeLatency({
    digitAt,
    stoppedAt,
    followUpAt: new Date("2026-10-10T10:00:00.100Z"),
  });
  assert.equal(overlapped.overlap, true);
  assert.equal(overlapped.followUpMs, 100);
});
