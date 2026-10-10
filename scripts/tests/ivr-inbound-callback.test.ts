/**
 * Inbound IVR callback (guest dials back Telnyx DID).
 * Pure logic + source invariants — no live Telnyx, no DB.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildIvrPhoneMatchVariants,
  ivrPhoneNationalKey,
  phonesLikelyMatch,
} from "../../lib/calls/ivrPhoneMatch";
import {
  disambiguateIvrInboundCandidates,
  filterInboundCandidatesByDestination,
  isIvrInvitationActiveForInbound,
  type IvrInboundCandidate,
} from "../../lib/calls/ivrInboundResolve";
import {
  buildIvrInboundIntroText,
  IVR_SYSTEM_PROMPTS,
} from "../../lib/calls/ivrScript";
import {
  getUserCallsType,
  isHumanCallsUser,
  isIvrCallsUser,
} from "../../lib/calls/callsType";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

function readSrc(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function candidate(
  partial: Partial<IvrInboundCandidate> & {
    guestId: string;
    invitationId: string;
  }
): IvrInboundCandidate {
  return {
    userId: partial.userId || "user1",
    phone: partial.phone || "+972501111111",
    eventName: partial.eventName || "אירוע",
    eventNamePronunciation: partial.eventNamePronunciation || "",
    guestName: partial.guestName || "אורח",
    guestId: partial.guestId,
    invitationId: partial.invitationId,
    storedPhone: partial.storedPhone,
    inboundDid: partial.inboundDid,
  };
}

test("phone variants cover IL local / E.164 storage formats", () => {
  const variants = buildIvrPhoneMatchVariants("+972501234567");
  assert.ok(variants.includes("+972501234567"));
  assert.ok(variants.includes("0501234567"));
  assert.ok(variants.includes("972501234567"));
  assert.equal(ivrPhoneNationalKey("+972501234567"), "501234567");
  assert.equal(ivrPhoneNationalKey("0501234567"), "501234567");
  assert.equal(phonesLikelyMatch("+972501234567", "0501234567"), true);
  assert.equal(phonesLikelyMatch("+972501234567", "0509999999"), false);
});

test("inbound intro uses exact callback script with event name", () => {
  const text = buildIvrInboundIntroText({
    eventName: "החתונה של הדס ורועי",
  });
  assert.equal(
    text,
    [
      "שלום, הגעתם למערכת אישורי ההגעה עבור החתונה של הדס ורועי.",
      "לאישור הגעה הקישו 1.",
      "לאי הגעה הקישו 2.",
      "אם עדיין אינכם יודעים הקישו 3.",
    ].join("\n")
  );
  assert.match(IVR_SYSTEM_PROMPTS.inboundAmbiguous, /לא הצלחנו לזהות/);
  assert.match(IVR_SYSTEM_PROMPTS.inboundNotFound, /לא מצאנו הזמנה/);
});

test("unique phone → matched; multiple without hint → ambiguous", () => {
  const a = candidate({
    guestId: "g1",
    invitationId: "inv1",
    eventName: "חתונה א",
  });
  const b = candidate({
    guestId: "g2",
    invitationId: "inv2",
    eventName: "חתונה ב",
  });

  const unique = disambiguateIvrInboundCandidates({ candidates: [a] });
  assert.equal(unique.status, "matched");
  if (unique.status === "matched") {
    assert.equal(unique.disambiguation, "unique");
    assert.equal(unique.candidate.guestId, "g1");
  }

  const ambiguous = disambiguateIvrInboundCandidates({
    candidates: [a, b],
  });
  assert.equal(ambiguous.status, "ambiguous");
  if (ambiguous.status === "ambiguous") {
    assert.equal(ambiguous.reason, "MULTIPLE_ACTIVE_IVR_EVENTS");
    assert.equal(ambiguous.candidates.length, 2);
  }
});

test("same event with two guest rows is one match, not an arbitrary event", () => {
  const a = candidate({
    guestId: "g1",
    invitationId: "inv1",
    eventName: "חתונה א",
    storedPhone: "0509999999",
  });
  const duplicate = candidate({
    guestId: "g2",
    invitationId: "inv1",
    eventName: "חתונה א",
    storedPhone: "+972501111111",
  });
  const collapsed = disambiguateIvrInboundCandidates({
    candidates: [a, duplicate],
  });
  assert.equal(collapsed.status, "matched");
  if (collapsed.status === "matched") {
    assert.equal(collapsed.candidate.invitationId, "inv1");
    assert.equal(collapsed.candidate.guestId, "g2");
  }
});

test("destination number keeps only the event line that was dialed", () => {
  const shared = candidate({
    guestId: "g1",
    invitationId: "inv1",
    eventName: "חתונה א",
  });
  const dedicated = candidate({
    guestId: "g2",
    invitationId: "inv2",
    eventName: "חתונה ב",
    inboundDid: "+972501111111",
  });
  const onDedicated = filterInboundCandidatesByDestination({
    candidates: [shared, dedicated],
    toPhone: "0501111111",
    platformDid: "+972555172720",
  });
  assert.equal(onDedicated.rejected, null);
  assert.equal(onDedicated.candidates.length, 1);
  assert.equal(onDedicated.candidates[0].invitationId, "inv2");

  const onPlatform = filterInboundCandidatesByDestination({
    candidates: [shared, dedicated],
    toPhone: "+972555172720",
    platformDid: "+972555172720",
  });
  assert.equal(onPlatform.candidates.length, 1);
  assert.equal(onPlatform.candidates[0].invitationId, "inv1");

  const unknownLine = filterInboundCandidatesByDestination({
    candidates: [shared],
    toPhone: "+972509999999",
    platformDid: "+972555172720",
  });
  assert.equal(unknownLine.rejected, "DESTINATION_MISMATCH");
  assert.equal(unknownLine.candidates.length, 0);
});

test("multi-event disambiguation by event name or recent outbound invitation", () => {
  const a = candidate({
    guestId: "g1",
    invitationId: "inv1",
    eventName: "חתונה א",
  });
  const b = candidate({
    guestId: "g2",
    invitationId: "inv2",
    eventName: "חתונה ב",
  });

  const byName = disambiguateIvrInboundCandidates({
    candidates: [a, b],
    eventNameHint: "חתונה ב",
  });
  assert.equal(byName.status, "matched");
  if (byName.status === "matched") {
    assert.equal(byName.disambiguation, "event_name");
    assert.equal(byName.candidate.invitationId, "inv2");
  }

  const byRecent = disambiguateIvrInboundCandidates({
    candidates: [a, b],
    recentInvitationId: "inv1",
  });
  assert.equal(byRecent.status, "matched");
  if (byRecent.status === "matched") {
    assert.equal(byRecent.disambiguation, "recent_outbound");
    assert.equal(byRecent.candidate.invitationId, "inv1");
  }
});

test("active invitation window allows recent past events", () => {
  const now = new Date("2026-10-07T12:00:00.000Z");
  assert.equal(
    isIvrInvitationActiveForInbound({ eventDate: null }, now),
    true
  );
  assert.equal(
    isIvrInvitationActiveForInbound(
      { eventDate: new Date("2026-10-01T18:00:00.000Z") },
      now
    ),
    true
  );
  assert.equal(
    isIvrInvitationActiveForInbound(
      { eventDate: new Date("2026-09-01T18:00:00.000Z") },
      now
    ),
    false
  );
});

test("human callsType users never qualify as IVR package", () => {
  const human = { includeCalls: true, callsType: "human" as const };
  const ivr = { includeCalls: true, callsType: "ivr" as const };
  const legacy = { includeCalls: true };
  assert.equal(isHumanCallsUser(human), true);
  assert.equal(isIvrCallsUser(human), false);
  assert.equal(isIvrCallsUser(ivr), true);
  assert.equal(getUserCallsType(legacy), "human");
});

test("voice webhook tries inbound IVR before softphone and skips softphone when handled", () => {
  const voice = readSrc("app/api/telnyx/voice/webhook/route.ts");
  assert.match(voice, /tryStartInboundIvr/);
  assert.match(voice, /inboundIvrHandled/);
  assert.match(voice, /!inboundIvrHandled && isSoftphoneWebrtcEnabled/);
  // Softphone path must remain for human / unmatched callers.
  assert.match(voice, /routeInboundCallToSoftphone/);
});

test("inbound start only claims IVR guests; human path untouched on none", () => {
  const start = readSrc("lib/calls/ivrInboundStart.ts");
  assert.match(start, /resolveInboundIvrGuest/);
  assert.match(start, /handled:\s*false/);
  assert.match(start, /channel:\s*"inbound_ivr"/);
  assert.match(start, /webhook_url|webhookUrl/);
  assert.match(start, /AMBIGUOUS_EVENT/);
  assert.match(start, /resolveApprovedNarrationUrl/);
  assert.match(start, /AUDIO_NOT_READY/);
  assert.match(start, /phase:\s*"RINGING"/);
  assert.match(start, /toPhone/);
  assert.equal(start.includes("gatherIvrUsingAudio"), false);
  assert.equal(start.includes("stage: \"choice\""), false);
  assert.equal(start.includes("ensureIvrInboundIntroAudio"), false);
  assert.equal(start.includes("ensureComposedInboundAudioForUser"), false);
  assert.match(start, /composedInboundPlaybackUrl/);
  assert.equal(start.includes("synthesizeElevenLabsSpeech"), false);
  assert.match(readSrc("lib/calls/ivrWebhookHandler.ts"), /startOutboundFromBeginning/);
  assert.match(readSrc("lib/calls/ivrDialer.ts"), /introBeforeEventName|eventNameAudioUrl/);
  // Must not call softphone bridge helpers.
  assert.equal(start.includes("routeInboundCallToSoftphone"), false);
});

test("resolve filters to callsType ivr owners only", () => {
  const resolve = readSrc("lib/calls/ivrInboundResolve.ts");
  assert.match(resolve, /callsType:\s*"ivr"/);
  assert.match(resolve, /isIvrCallsUser/);
  assert.match(resolve, /disambiguateIvrInboundCandidates/);
  assert.equal(resolve.includes("callsType: \"human\""), false);
});

test("inbound history channel + RSVP updates reuse outbound DTMF apply", () => {
  const model = readSrc("models/IvrCallAttempt.ts");
  assert.match(model, /inbound_ivr/);
  assert.match(model, /channel:/);

  const webhook = readSrc("lib/calls/ivrWebhookHandler.ts");
  const machine = readSrc("lib/calls/ivrCallMachine.ts");
  assert.match(webhook, /inbound_ivr|isInboundIvrAttempt/);
  assert.match(machine, /applyIvrRsvpToGuest/);
  assert.match(webhook, /rsvp:\s*"yes"/);
  assert.match(webhook, /rsvp:\s*"no"/);
  assert.match(webhook, /rsvp:\s*"maybe"/);
  // Existing guest RSVP must not block a new inbound attempt (claim uses rsvpApplied:false).
  assert.match(machine, /rsvpApplied:\s*false/);
});

test("inbound IVR webhook override separates DTMF from softphone webhook", () => {
  const start = readSrc("lib/calls/ivrInboundStart.ts");
  assert.match(start, /\/api\/telnyx\/ivr\/webhook/);
  assert.match(start, /answerIvrCall/);
  const control = readSrc("lib/telnyx/ivrCallControl.ts");
  assert.match(control, /webhook_url/);
  assert.match(control, /gather_using_speak/);
});

test("E2E invariant: human softphone routing code path never imports inbound IVR gather", () => {
  const softphone = readSrc("lib/telnyx/inboundRouting.ts");
  assert.equal(softphone.includes("tryStartInboundIvr"), false);
  assert.equal(softphone.includes("inbound_ivr"), false);
  assert.equal(softphone.includes("gatherIvr"), false);
  assert.equal(softphone.includes("applyIvrRsvp"), false);
});
