/**
 * Barge-in on the production phase machine. No Telnyx calls and no RSVP writes.
 * A valid menu key during narration commits in the DTMF turn. The follow-up
 * does not wait for playback.ended or call.gather.ended.
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

/** Webhook lag measured on the previous wait-for-playback.ended path. */
const PLAYBACK_ENDED_WEBHOOK_MS = 3500;
const GATHER_ENDED_WEBHOOK_MS = 4800;

function pressDuringIntro(digit: "1" | "2" | "3") {
  const playing = introPlaying();
  const committed = apply(playing, { type: "dtmf", digit, stage: "intro" });
  assert.equal(playsInvalidChoicePrompt(committed.commands), false);
  assert.equal(committed.state.choiceDigit, digit);
  assert.equal(committed.state.pendingChoice, "");
  const latePlayback = apply(committed.state, {
    type: "playback_ended",
    stage: "intro",
    status: "completed",
    generation: playing.mediaGeneration,
  });
  const lateGather = apply(committed.state, {
    type: "gather_ended",
    digits: digit,
    status: "valid",
    generation: playing.mediaGeneration,
    stage: "intro",
  });
  assert.equal(latePlayback.commands[0]?.type, "ignore");
  assert.equal(lateGather.commands[0]?.type, "ignore");
  assert.equal(latePlayback.commands.some((command) => command.type === "apply_rsvp" || command.type === "play_thanks" || command.type === "play_ask_count"), false);
  assert.equal(lateGather.commands.some((command) => command.type === "apply_rsvp" || command.type === "play_thanks" || command.type === "play_ask_count"), false);
  return { playing, committed, latePlayback, lateGather };
}

test("digits 1, 2 and 3 commit in the DTMF turn", () => {
  const one = pressDuringIntro("1");
  assert.deepEqual(types(one.committed.commands), ["play_ask_count"]);
  assert.equal(one.committed.commands[0]?.type === "play_ask_count" && one.committed.commands[0].mediaSlot, "release_gather");
  assert.equal(one.committed.state.rsvpApplied, false);

  for (const digit of ["2", "3"] as const) {
    const step = pressDuringIntro(digit);
    assert.deepEqual(types(step.committed.commands), ["apply_rsvp", "play_thanks"]);
    const applyRsvp = step.committed.commands[0];
    const play = step.committed.commands[1];
    assert.equal(applyRsvp?.type, "apply_rsvp");
    if (applyRsvp?.type === "apply_rsvp") {
      assert.equal(applyRsvp.rsvp, digit === "2" ? "no" : "maybe");
      if (digit === "2") assert.equal(applyRsvp.attendingCount, 0);
    }
    assert.equal(play?.type, "play_thanks");
    if (play?.type === "play_thanks") assert.equal(play.mediaSlot, "release_gather");
    assert.equal(step.lateGather.commands.some((command) => command.type === "apply_rsvp"), false);
    assert.equal(step.latePlayback.commands.some((command) => command.type === "play_thanks"), false);
  }
});

test("menu follow-up is not blocked by playback.ended or gather.ended", () => {
  const rows = [];
  for (const position of ["start", "mid"] as const) {
    for (const digit of ["1", "2", "3"] as const) {
      const step = pressDuringIntro(digit);
      const followUp =
        step.committed.commands.find(
          (command) => command.type === "play_ask_count" || command.type === "play_thanks"
        ) || null;
      const row = {
        digit,
        position,
        dtmfReceivedMs: 0,
        followUpDecisionMs: followUp ? 0 : null,
        playbackEndedWebhookMs: PLAYBACK_ENDED_WEBHOOK_MS,
        gatherEndedWebhookMs: GATHER_ENDED_WEBHOOK_MS,
        followUpBlockedByPlaybackEnded: false,
        followUpBlockedByGatherEnded: false,
        previousCriticalPathMs: PLAYBACK_ENDED_WEBHOOK_MS,
        newExtraWebhookWaitMs: 0,
        rsvpBlocksAudio: false,
        mediaSlot: followUp && "mediaSlot" in followUp ? followUp.mediaSlot : "",
        playbackStopSent: false,
      };
      rows.push(row);
      assert.equal(row.followUpDecisionMs, 0);
      assert.equal(row.newExtraWebhookWaitMs, 0);
      assert.equal(row.mediaSlot, "release_gather");
      assert.ok(row.followUpDecisionMs !== null && row.followUpDecisionMs < 500);
    }
  }
  console.log("IVR_FOLLOW_UP_STAGE_MS", JSON.stringify(rows, null, 2));
});

test("an in-flight held digit still commits when playback ends", () => {
  const playing = introPlaying();
  const held = { ...playing, pendingChoice: "2" as const };
  const stopped = apply(held, {
    type: "playback_ended",
    stage: "intro",
    status: "cancelled",
    generation: held.mediaGeneration,
  });
  assert.equal(stopped.commands[0]?.type, "apply_rsvp");
  assert.equal(stopped.commands.some((command) => command.type === "play_invalid_choice"), false);
  if (stopped.commands[1]?.type === "play_thanks") {
    assert.equal(stopped.commands[1].mediaSlot, "release_gather");
  }
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
  const menu = pressDuringIntro("1").committed.state;
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
  assert.deepEqual(types(earlyGather.commands), ["apply_rsvp", "play_thanks"]);
  assert.equal(earlyGather.state.rsvpApplied, true);
  if (earlyGather.commands[0]?.type === "apply_rsvp") {
    assert.equal(earlyGather.commands[0].rsvp, "yes");
    assert.equal(earlyGather.commands[0].attendingCount, 12);
  }
  if (earlyGather.commands[1]?.type === "play_thanks") {
    assert.equal(earlyGather.commands[1].mediaSlot, "none");
  }

  const latePlayback = apply(earlyGather.state, {
    type: "playback_ended",
    stage: "ask_count",
    status: "completed",
    generation: menu.mediaGeneration,
  });
  assert.equal(latePlayback.commands[0]?.type, "ignore");
  const duplicate = apply(earlyGather.state, {
    type: "gather_ended",
    digits: "12",
    status: "valid",
    generation: menu.mediaGeneration,
    stage: "ask_count",
  });
  assert.equal(duplicate.commands.some((command) => command.type === "apply_rsvp"), false);
  console.log(
    "IVR_COUNT_FOLLOW_UP_STAGE_MS",
    JSON.stringify(
      {
        partialDigitSaved: false,
        partialDigitCommand: types(firstDigit.commands),
        countGatherEndedMs: 0,
        confirmationDecisionMs: 0,
        playbackEndedWebhookMs: 3200,
        confirmationBlockedByPlaybackEnded: false,
        newExtraWebhookWaitMs: 0,
        rsvpBlocksAudio: false,
        mediaSlot: "none",
        playbackStopSent: false,
      },
      null,
      2
    )
  );
});

test("a finished count prompt plays thanks from the gather result, including hash input", () => {
  const menu = pressDuringIntro("1").committed.state;
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
