/**
 * Guest-count entry waits one second between digits, then saves once.
 * No Telnyx calls and no database writes.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  initialIvrCallState,
  reduceIvrCall,
  type IvrCallMachineState,
  type IvrMachineCommand,
} from "../../lib/calls/ivrCallPhase";
import { parseDtmfGuestCount } from "../../lib/calls/ivrRoundEligibility";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const COUNTS = ["1", "2", "12", "20", "100"] as const;

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function apply(state: IvrCallMachineState, event: Parameters<typeof reduceIvrCall>[1]) {
  return reduceIvrCall(state, event);
}

function commandTypes(commands: IvrMachineCommand[]) {
  return commands.map((command) => command.type);
}

function toCountWindow() {
  let state = initialIvrCallState();
  const answered = apply(state, { type: "answered" });
  state = answered.state;
  const heard = apply(state, {
    type: "playback_ended",
    stage: "intro",
    status: "completed",
    generation: state.mediaGeneration,
  });
  const menu = apply(heard.state, {
    type: "gather_ended",
    digits: "1",
    status: "valid",
    generation: heard.state.mediaGeneration,
    stage: "choice",
  });
  assert.deepEqual(commandTypes(menu.commands), ["play_ask_count"]);
  const asked = apply(menu.state, {
    type: "playback_ended",
    stage: "ask_count",
    status: "completed",
    generation: menu.state.mediaGeneration,
  });
  assert.equal(asked.state.inputTarget, "count");
  assert.equal(asked.state.rsvpApplied, false);
  return asked.state;
}

function savedCount(commands: IvrMachineCommand[]) {
  const save = commands.find((command) => command.type === "apply_rsvp");
  assert.ok(save && save.type === "apply_rsvp");
  return save;
}

test("count gather waits 1000ms between digits and still ends on #", () => {
  const machine = readSrc("lib/calls/ivrCallMachine.ts");
  const webhook = readSrc("lib/calls/ivrWebhookHandler.ts");
  for (const src of [machine, webhook]) {
    assert.match(src, /const COUNT_INTER_DIGIT_MS = 1000;/);
    assert.doesNotMatch(src, /COUNT_INTER_DIGIT_MS = 2500/);
  }
  assert.match(machine, /const CHOICE_TIMEOUT_MS = 15000;/);
  assert.match(machine, /const COUNT_TIMEOUT_MS = 20000;/);
  assert.match(machine, /const COUNT_DIGIT_MAX = 3;/);
  assert.match(machine, /interDigitTimeoutMillis: COUNT_INTER_DIGIT_MS/);
  assert.match(machine, /terminatingDigit: kind === "choice" \? "" : "#"/);
  assert.match(machine, /terminatingDigit: "#"/);
  assert.equal(webhook.match(/interDigitTimeoutMillis: COUNT_INTER_DIGIT_MS/g)?.length, 3);
});

test("counts 1, 2, 12, 20 and 100 save once and start thanks", () => {
  for (const digits of COUNTS) {
    const parsed = parseDtmfGuestCount(digits);
    assert.deepEqual(parsed, { ok: true, count: Number(digits) });

    const waiting = toCountWindow();
    const partial = apply(waiting, { type: "dtmf", digit: digits[0], stage: "count" });
    assert.equal(partial.state.rsvpApplied, false);
    assert.equal(partial.commands.some((command) => command.type === "apply_rsvp"), false);
    assert.equal(partial.commands[0]?.type, "ignore");

    const saved = apply(partial.state, {
      type: "gather_ended",
      digits,
      status: "valid",
      generation: waiting.mediaGeneration,
      stage: "count",
    });
    const rsvp = savedCount(saved.commands);
    assert.equal(rsvp.rsvp, "yes");
    assert.equal(rsvp.attendingCount, Number(digits));
    assert.equal(saved.commands.some((command) => command.type === "play_thanks"), true);
    assert.equal(saved.state.rsvpApplied, true);

    const again = apply(saved.state, {
      type: "gather_ended",
      digits,
      status: "valid",
      generation: waiting.mediaGeneration,
      stage: "count",
    });
    assert.equal(again.commands.some((command) => command.type === "apply_rsvp"), false);
    assert.equal(again.state.rsvpApplied, true);
  }
});

test("hash finishes the typed count without saving a shorter prefix", () => {
  for (const digits of ["1#", "2#", "12#", "20#", "100#"]) {
    const expected = Number(digits.replace("#", ""));
    assert.deepEqual(parseDtmfGuestCount(digits), { ok: true, count: expected });
    const waiting = toCountWindow();
    const saved = apply(waiting, {
      type: "gather_ended",
      digits,
      status: "valid",
      generation: waiting.mediaGeneration,
      stage: "count",
    });
    const rsvp = savedCount(saved.commands);
    assert.equal(rsvp.attendingCount, expected);
    assert.equal(saved.commands.filter((command) => command.type === "apply_rsvp").length, 1);
  }
});
