/**
 * IVR Call Control webhook processing — idempotent RSVP updates.
 *
 * AI outbound intro plays three clips in sequence:
 * global.introBeforeEventName → event.eventNameAudio → global.introAfterEventName (gather)
 * DTMF follow-ups use the same global gender pack.
 */

import IvrCallAttempt from "@/models/IvrCallAttempt";
import { fillIvrRoundCapacity } from "@/lib/calls/ivrDialer";
import {
  applyIvrRsvpToGuest,
  parseDtmfGuestCount,
} from "@/lib/calls/ivrApplyRsvp";
import {
  getGlobalPackSegmentUrl,
  getIvrSystemAudioUrlForGender,
} from "@/lib/calls/ivrSystemAudio";
import {
  normalizeIvrVoiceGender,
  type IvrVoiceGender,
} from "@/lib/calls/ivrScript";
import {
  decodeIvrClientState,
  gatherIvrDigits,
  gatherIvrUsingAudio,
  hangupIvrCall,
  playbackIvrAudio,
} from "@/lib/telnyx/ivrCallControl";
import {
  describeIvrTelnyxEvent,
  ivrEventInstant,
  pushIvrTimeline,
} from "@/lib/calls/ivrCallTimeline";

const COUNT_DIGIT_MAX = 3;
const COUNT_INTER_DIGIT_MS = 2500;
const CHOICE_FLOW_STEPS = [
  "playing_intro",
  "playing_intro_before",
  "playing_event_name",
  "playing_intro_after",
  "gather_choice",
  "playing_invalid",
];

async function claimChoiceDigit(attemptId: any, digit: string) {
  return IvrCallAttempt.findOneAndUpdate(
    {
      _id: attemptId,
      rsvpApplied: { $ne: true },
      flowStep: { $in: CHOICE_FLOW_STEPS },
      choiceDigit: { $nin: ["1", "2", "3"] },
    },
    {
      $set: {
        choiceDigit: digit,
        flowStep: digit === "1" ? "playing_ask_count" : "playing_thanks",
      },
      $push: { dtmfDigits: digit },
    },
    { new: true }
  );
}

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isInboundIvrAttempt(attempt: any) {
  return (
    cleanStr(attempt?.channel) === "inbound_ivr" ||
    cleanStr(attempt?.direction) === "inbound"
  );
}

function attemptVoiceGender(attempt: any): IvrVoiceGender {
  return normalizeIvrVoiceGender(attempt?.voiceGender) || "female";
}

async function playInboundChoiceGather(input: {
  attempt: any;
  callControlId: string;
}) {
  const gender = attemptVoiceGender(input.attempt);
  const eventNameUrl = cleanStr(input.attempt.eventNameAudioUrl);
  const beforeUrl = await getGlobalPackSegmentUrl(
    gender,
    "inboundBeforeEventName"
  );

  if (beforeUrl) {
    input.attempt.flowStep = "playing_intro_before";
    await input.attempt.save();
    await playbackIvrAudio(input.callControlId, beforeUrl, {
      source: "invistimo-ivr",
      inbound_ivr: true,
      callAttemptId: String(input.attempt._id),
      stage: eventNameUrl ? "inbound_play_event_name" : "inbound_play_after",
      voiceGender: gender,
    });
    return;
  }

  const afterUrl = await getGlobalPackSegmentUrl(
    gender,
    "inboundAfterEventName"
  );
  if (!afterUrl) return;

  await gatherIvrUsingAudio({
    callControlId: input.callControlId,
    audioUrl: afterUrl,
    minimumDigits: 1,
    maximumDigits: 1,
    validDigits: "123",
    timeoutMillis: 45000,
    clientState: {
      source: "invistimo-ivr",
      inbound_ivr: true,
      channel: "inbound_ivr",
      callAttemptId: String(input.attempt._id),
      stage: "choice",
    },
  });
  input.attempt.flowStep = "gather_choice";
  await input.attempt.save();
}

/**
 * One outbound player, from second 0.
 * AI: introBeforeEventName → event name → introAfterEventName, then wait for DTMF.
 * Self-record: the saved file only, still a single player.
 */
async function startOutboundFromBeginning(input: {
  attempt: any;
  callControlId: string;
}) {
  const gender = attemptVoiceGender(input.attempt);
  const eventNameUrl = cleanStr(input.attempt.eventNameAudioUrl);
  const baseState = {
    source: "invistimo-ivr",
    callAttemptId: String(input.attempt._id),
    voiceGender: gender,
  };

  if (eventNameUrl) {
    const beforeUrl = await getGlobalPackSegmentUrl(
      gender,
      "introBeforeEventName"
    );
    if (beforeUrl) {
      await playbackIvrAudio(input.callControlId, beforeUrl, {
        ...baseState,
        stage: "play_event_name",
      });
      return;
    }
  }

  const introUrl = cleanStr(input.attempt.introAudioUrl);
  if (!introUrl) return;

  input.attempt.flowStep = "gather_choice";
  await input.attempt.save();
  await gatherIvrUsingAudio({
    callControlId: input.callControlId,
    audioUrl: introUrl,
    minimumDigits: 1,
    maximumDigits: 1,
    validDigits: "123",
    timeoutMillis: 45000,
    clientState: {
      ...baseState,
      stage: "choice",
    },
  });
}

async function continueOutboundAiIntro(input: {
  attempt: any;
  callControlId: string;
  stage: string;
}) {
  if (["1", "2", "3"].includes(cleanStr(input.attempt.choiceDigit))) return;
  const gender = attemptVoiceGender(input.attempt);

  if (input.stage === "play_event_name") {
    const eventNameUrl = cleanStr(input.attempt.eventNameAudioUrl);
    if (!eventNameUrl) return;

    input.attempt.flowStep = "playing_event_name";
    await input.attempt.save();

    await playbackIvrAudio(input.callControlId, eventNameUrl, {
      source: "invistimo-ivr",
      callAttemptId: String(input.attempt._id),
      stage: "play_intro_after",
      voiceGender: gender,
    });
    return;
  }

  if (input.stage === "play_intro_after") {
    const afterUrl = await getGlobalPackSegmentUrl(
      gender,
      "introAfterEventName"
    );
    if (!afterUrl) return;

    input.attempt.flowStep = "playing_intro_after";
    await input.attempt.save();

    await playbackIvrAudio(input.callControlId, afterUrl, {
      source: "invistimo-ivr",
      callAttemptId: String(input.attempt._id),
      stage: "play_choice_prompt",
      voiceGender: gender,
    });
    return;
  }

  if (input.stage === "play_choice_prompt") {
    input.attempt.flowStep = "gather_choice";
    await input.attempt.save();
    await gatherIvrDigits({
      callControlId: input.callControlId,
      minimumDigits: 1,
      maximumDigits: 1,
      validDigits: "123",
      timeoutMillis: 45000,
      clientState: {
        source: "invistimo-ivr",
        callAttemptId: String(input.attempt._id),
        stage: "choice",
        voiceGender: gender,
      },
    });
  }
}

function getEventType(body: any) {
  return cleanStr(body?.data?.event_type || body?.event_type);
}

function getPayload(body: any) {
  return body?.data?.payload || body?.payload || {};
}

function getEventId(body: any) {
  return cleanStr(body?.data?.id || body?.id || "");
}

async function markWebhookProcessed(attemptId: string, eventId: string) {
  if (!eventId) return true;

  const updated = await IvrCallAttempt.findOneAndUpdate(
    {
      _id: attemptId,
      processedWebhookEventIds: { $ne: eventId },
    },
    {
      $addToSet: { processedWebhookEventIds: eventId },
    },
    { new: true }
  );

  return Boolean(updated);
}

async function findAttemptFromEvent(body: any) {
  const payload = getPayload(body);
  const clientState = decodeIvrClientState(payload?.client_state);
  const attemptId = cleanStr(
    clientState.callAttemptId || clientState.call_attempt_id || ""
  );
  const callControlId = cleanStr(payload?.call_control_id);

  if (attemptId) {
    const byId = await IvrCallAttempt.findById(attemptId);
    if (byId) return byId;
  }

  if (callControlId) {
    return IvrCallAttempt.findOne({ telnyxCallControlId: callControlId });
  }

  return null;
}

async function applyRsvpOnce(input: {
  attempt: any;
  rsvp: "yes" | "no" | "maybe";
  attendingCount?: number | null;
}) {
  if (input.attempt.rsvpApplied) {
    return { applied: false, reason: "already_applied" };
  }

  const claimed = await IvrCallAttempt.findOneAndUpdate(
    {
      _id: input.attempt._id,
      rsvpApplied: false,
    },
    {
      $set: {
        rsvpApplied: true,
        rsvpAppliedAt: new Date(),
        rsvpResult: input.rsvp,
        attendingCount:
          typeof input.attendingCount === "number"
            ? input.attendingCount
            : null,
        status: "completed",
      },
      $push: {
        timeline: {
          $each: [
            {
              at: new Date(),
              source: "server",
              kind: "rsvp_saved",
              label: "נשמרה תשובה ברשומה",
              detail: `${input.rsvp}${
                typeof input.attendingCount === "number"
                  ? `:${input.attendingCount}`
                  : ""
              }`,
              eventType: "",
              digit: "",
              stage: "",
            },
          ],
          $slice: -120,
        },
      },
    },
    { new: true }
  );

  if (!claimed) {
    return { applied: false, reason: "race_already_applied" };
  }

  try {
    await applyIvrRsvpToGuest({
      guestId: String(claimed.guestId),
      invitationId: String(claimed.invitationId),
      rsvp: input.rsvp,
      attendingCount: input.attendingCount,
      respondedAt: claimed.rsvpAppliedAt || new Date(),
      round: claimed.round ?? null,
      callAttemptId: String(claimed._id),
      callControlId: String(claimed.telnyxCallControlId || ""),
      source: isInboundIvrAttempt(claimed) ? "inbound" : "outbound",
    });
  } catch (error) {
    await IvrCallAttempt.updateOne(
      { _id: claimed._id },
      {
        $set: {
          rsvpApplied: false,
          rsvpAppliedAt: null,
          rsvpResult: null,
          status: "answered",
          flowStep: "gather_choice",
          choiceDigit: "",
        },
        $push: {
          timeline: {
            $each: [
              {
                at: new Date(),
                source: "server",
                kind: "rsvp_failed",
                label: "שמירת התשובה נכשלה",
                detail: error instanceof Error ? error.message : "RSVP_SAVE_FAILED",
                eventType: "",
                digit: "",
                stage: "",
              },
            ],
            $slice: -120,
          },
        },
      }
    );
    throw error;
  }

  input.attempt.rsvpApplied = true;
  input.attempt.status = "completed";
  return { applied: true };
}

export async function handleIvrTelnyxWebhook(body: any) {
  const eventType = getEventType(body);
  const payload = getPayload(body);
  const eventId = getEventId(body);
  const callControlId = cleanStr(payload?.call_control_id);

  const attempt = await findAttemptFromEvent(body);
  if (!attempt) {
    return { ok: true, ignored: true, reason: "NO_ATTEMPT" };
  }

  const fresh = await markWebhookProcessed(String(attempt._id), eventId);
  if (!fresh && eventId) {
    return { ok: true, ignored: true, reason: "DUPLICATE_EVENT", eventId };
  }

  if (callControlId && !attempt.telnyxCallControlId) {
    attempt.telnyxCallControlId = callControlId;
  }
  if (payload?.call_leg_id) {
    attempt.telnyxCallLegId = cleanStr(payload.call_leg_id);
  }
  if (payload?.call_session_id) {
    attempt.telnyxCallSessionId = cleanStr(payload.call_session_id);
  }

  const gender = attemptVoiceGender(attempt);
  const observedAt = ivrEventInstant(body);
  const described = describeIvrTelnyxEvent(eventType, payload);
  const setIfEmpty: Record<string, Date> = {};
  if (eventType === "call.ringing") setIfEmpty.ringingAt = observedAt;
  if (
    eventType === "call.playback.started" ||
    eventType === "call.speak.started"
  ) {
    setIfEmpty.playbackStartedAt = observedAt;
  }
  if (eventType === "call.dtmf.received" || eventType === "call.gather.ended") {
    setIfEmpty.firstDigitAt = observedAt;
    const choice = described.digit.slice(0, 1);
    if (choice === "1" || choice === "2" || choice === "3") {
      setIfEmpty.choiceDigitAt = observedAt;
    }
  }
  const noted = pushIvrTimeline(
    attempt._id,
    {
      at: observedAt,
      source: "telnyx",
      kind: described.kind,
      label: described.label,
      detail: described.detail,
      eventType,
      digit: described.digit,
    },
    {
      setIfEmpty,
      setFollowupPlayback:
        eventType === "call.playback.started" ||
        eventType === "call.speak.started"
          ? observedAt
          : undefined,
    }
  ).catch((error) => {
    console.error(
      "IVR_TIMELINE",
      error instanceof Error ? error.message : error
    );
  });

  try {
  switch (eventType) {
    case "call.initiated": {
      attempt.status = "initiated";
      await attempt.save();
      break;
    }

    case "call.ringing": {
      attempt.status = "ringing";
      await attempt.save();
      break;
    }

    case "call.answered": {
      if (isInboundIvrAttempt(attempt)) {
        attempt.answered = true;
        attempt.answeredAt = attempt.answeredAt || new Date();
        if (attempt.status !== "completed" && attempt.status !== "unresolved") {
          attempt.status = "answered";
        }
        const alreadyPlaying =
          attempt.flowStep !== "playing_intro" &&
          attempt.flowStep !== "dialing";
        if (!alreadyPlaying && callControlId && !attempt.rsvpApplied) {
          attempt.flowStep = "playing_intro_before";
          await attempt.save();
          await playInboundChoiceGather({ attempt, callControlId });
        } else {
          await attempt.save();
        }
        break;
      }

      const claimedAnswer = await IvrCallAttempt.findOneAndUpdate(
        {
          _id: attempt._id,
          flowStep: { $in: ["dialing", "playing_intro", "answer_delay"] },
          rsvpApplied: { $ne: true },
        },
        {
          $set: {
            status: "answered",
            answered: true,
            answeredAt: attempt.answeredAt || new Date(),
            flowStep: "playing_intro_before",
          },
        },
        { new: true }
      );
      if (!claimedAnswer) {
        if (!attempt.answered) {
          attempt.answered = true;
          attempt.answeredAt = attempt.answeredAt || new Date();
          if (attempt.status !== "completed") attempt.status = "answered";
          await attempt.save();
        }
        break;
      }
      attempt.status = "answered";
      attempt.answered = true;
      attempt.flowStep = "playing_intro_before";
      if (callControlId) {
        await startOutboundFromBeginning({
          attempt: claimedAnswer,
          callControlId,
        });
      }
      break;
    }

    case "call.dtmf.received":
    case "call.gather.ended": {
      if (attempt.rsvpApplied || attempt.flowStep === "done") break;
      if (
        attempt.status === "unresolved" ||
        attempt.error === "AMBIGUOUS_EVENT"
      ) {
        break;
      }
      if (!attempt.guestId || !attempt.invitationId) break;

      const gatherStatus = cleanStr(payload?.status).toLowerCase();
      if (
        eventType === "call.gather.ended" &&
        (gatherStatus === "cancelled" || gatherStatus === "canceled")
      ) {
        break;
      }

      const digits = cleanStr(
        payload?.digit ||
          payload?.digits ||
          payload?.result ||
          payload?.gathered_digits
      );
      if (!digits && gatherStatus === "call_hangup") {
        break;
      }
      const stage = cleanStr(
        decodeIvrClientState(payload?.client_state).stage
      );
      const choiceAccepted = ["1", "2", "3"].includes(
        cleanStr(attempt.choiceDigit)
      );
      // Choice gather and a parallel DTMF event must not be re-read as the
      // guest count after the choice already advanced the flow.
      if (
        choiceAccepted &&
        stage !== "count" &&
        attempt.flowStep !== "gather_choice"
      ) {
        break;
      }

      const counting =
        stage === "count" ||
        attempt.flowStep === "gather_count" ||
        attempt.flowStep === "playing_ask_count";

      if (eventType === "call.dtmf.received") {
        if (!digits) break;
        // Multi-digit guest counts arrive on gather.ended only.
        if (counting) break;
        const one = digits.slice(0, 1);
        const waitingChoice =
          !choiceAccepted &&
          ["1", "2", "3"].includes(one) &&
          (CHOICE_FLOW_STEPS.includes(attempt.flowStep) || stage === "choice");
        if (!waitingChoice) break;
      }

      if (
        stage === "count" ||
        (attempt.flowStep === "gather_count" && stage !== "choice")
      ) {
        attempt.guestCountDigits = digits;
        if (digits) {
          attempt.dtmfDigits = [...(attempt.dtmfDigits || []), digits];
        }
        const parsed = parseDtmfGuestCount(digits);

        if (!parsed.ok) {
          attempt.status = "invalid_input";
          attempt.flowStep = "playing_invalid";
          await attempt.save();

          const invalidUrl = await getIvrSystemAudioUrlForGender(
            gender,
            "invalidGuestCount"
          );
          if (callControlId && invalidUrl) {
            await gatherIvrUsingAudio({
              callControlId,
              audioUrl: invalidUrl,
              minimumDigits: 1,
              maximumDigits: COUNT_DIGIT_MAX,
              terminatingDigit: "#",
              interDigitTimeoutMillis: COUNT_INTER_DIGIT_MS,
              timeoutMillis: 12000,
              clientState: {
                source: "invistimo-ivr",
                callAttemptId: String(attempt._id),
                stage: "count",
              },
            });
            attempt.flowStep = "gather_count";
            await attempt.save();
          }
          break;
        }

        const thanksPromise = getIvrSystemAudioUrlForGender(
          gender,
          "thanksAttending"
        );
        await applyRsvpOnce({
          attempt,
          rsvp: "yes",
          attendingCount: parsed.count,
        });
        const thanksUrl = await thanksPromise;
        if (callControlId && thanksUrl) {
          attempt.flowStep = "playing_thanks";
          await Promise.all([
            attempt.save(),
            playbackIvrAudio(callControlId, thanksUrl, {
              source: "invistimo-ivr",
              callAttemptId: String(attempt._id),
              stage: "hangup_after_thanks",
            }),
          ]);
        } else if (callControlId) {
          await hangupIvrCall(callControlId);
        }
        break;
      }

      const choiceDigit = digits.slice(0, 1);
      if (!["1", "2", "3"].includes(choiceDigit)) {
        attempt.status = "invalid_input";
        const invalidUrl = await getIvrSystemAudioUrlForGender(
          gender,
          "invalidInput"
        );
        if (callControlId && invalidUrl) {
          attempt.flowStep = "gather_choice";
          await Promise.all([
            attempt.save(),
            gatherIvrUsingAudio({
              callControlId,
              audioUrl: invalidUrl,
              minimumDigits: 1,
              maximumDigits: 1,
              validDigits: "123",
              timeoutMillis: 12000,
              clientState: {
                source: "invistimo-ivr",
                callAttemptId: String(attempt._id),
                stage: "choice",
              },
            }),
          ]);
        }
        break;
      }

      const followUpPromise = getIvrSystemAudioUrlForGender(
        gender,
        choiceDigit === "1" ? "askGuestCount" : "thanksReceived"
      );
      const claimedChoice = await claimChoiceDigit(attempt._id, choiceDigit);
      if (!claimedChoice) {
        await followUpPromise.catch(() => "");
        break;
      }
      attempt.choiceDigit = choiceDigit;
      attempt.flowStep = claimedChoice.flowStep;
      attempt.dtmfDigits = claimedChoice.dtmfDigits;

      if (choiceDigit === "1") {
        const askUrl = await followUpPromise;

        if (callControlId && askUrl) {
          attempt.flowStep = "gather_count";
          await Promise.all([
            attempt.save(),
            gatherIvrUsingAudio({
              callControlId,
              audioUrl: askUrl,
              minimumDigits: 1,
              maximumDigits: COUNT_DIGIT_MAX,
              terminatingDigit: "#",
              interDigitTimeoutMillis: COUNT_INTER_DIGIT_MS,
              timeoutMillis: 45000,
              clientState: {
                source: "invistimo-ivr",
                callAttemptId: String(attempt._id),
                stage: "count",
              },
            }),
          ]);
        } else if (callControlId) {
          attempt.flowStep = "gather_count";
          await Promise.all([
            attempt.save(),
            gatherIvrDigits({
              callControlId,
              minimumDigits: 1,
              maximumDigits: COUNT_DIGIT_MAX,
              terminatingDigit: "#",
              interDigitTimeoutMillis: COUNT_INTER_DIGIT_MS,
              timeoutMillis: 45000,
              clientState: {
                source: "invistimo-ivr",
                callAttemptId: String(attempt._id),
                stage: "count",
              },
            }),
          ]);
        }
        break;
      }

      if (choiceDigit === "2") {
        const thanksUrl = await Promise.all([
          followUpPromise,
          applyRsvpOnce({
            attempt,
            rsvp: "no",
            attendingCount: 0,
          }),
        ]).then(([url]) => url);
        if (callControlId && thanksUrl) {
          attempt.flowStep = "playing_thanks";
          await Promise.all([
            attempt.save(),
            playbackIvrAudio(callControlId, thanksUrl, {
              source: "invistimo-ivr",
              callAttemptId: String(attempt._id),
              stage: "hangup_after_thanks",
            }),
          ]);
        } else if (callControlId) {
          await hangupIvrCall(callControlId);
        }
        break;
      }

      if (choiceDigit === "3") {
        const thanksUrl = await Promise.all([
          followUpPromise,
          applyRsvpOnce({
            attempt,
            rsvp: "maybe",
          }),
        ]).then(([url]) => url);
        if (callControlId && thanksUrl) {
          attempt.flowStep = "playing_thanks";
          await Promise.all([
            attempt.save(),
            playbackIvrAudio(callControlId, thanksUrl, {
              source: "invistimo-ivr",
              callAttemptId: String(attempt._id),
              stage: "hangup_after_thanks",
            }),
          ]);
        } else if (callControlId) {
          await hangupIvrCall(callControlId);
        }
      }

      break;
    }

    case "call.playback.ended":
    case "call.speak.ended": {
      const clientState = decodeIvrClientState(payload?.client_state);
      const stage = cleanStr(clientState.stage);
      const playbackStatus = cleanStr(payload?.status).toLowerCase();
      if (playbackStatus === "cancelled" || playbackStatus === "canceled") {
        break;
      }
      const choiceTaken = ["1", "2", "3"].includes(cleanStr(attempt.choiceDigit));

      if (
        !choiceTaken &&
        (stage === "play_event_name" ||
          stage === "play_intro_after" ||
          stage === "play_choice_prompt") &&
        callControlId &&
        !isInboundIvrAttempt(attempt)
      ) {
        const expectedStep =
          stage === "play_event_name"
            ? "playing_intro_before"
            : stage === "play_intro_after"
              ? "playing_event_name"
              : "playing_intro_after";
        if (attempt.flowStep !== expectedStep) break;
        if (playbackStatus === "failed" && cleanStr(clientState.retry) !== "1") {
          const retryUrl =
            stage === "play_event_name"
              ? await getGlobalPackSegmentUrl(gender, "introBeforeEventName")
              : stage === "play_intro_after"
                ? cleanStr(attempt.eventNameAudioUrl)
                : await getGlobalPackSegmentUrl(gender, "introAfterEventName");
          if (retryUrl) {
            await playbackIvrAudio(callControlId, retryUrl, {
              ...clientState,
              retry: "1",
              stage,
            });
          }
          break;
        }
        if (playbackStatus === "failed") break;
        await continueOutboundAiIntro({ attempt, callControlId, stage });
        break;
      }

      if (
        !choiceTaken &&
        stage === "inbound_play_event_name" &&
        callControlId &&
        isInboundIvrAttempt(attempt)
      ) {
        const eventNameUrl = cleanStr(attempt.eventNameAudioUrl);
        if (eventNameUrl) {
          attempt.flowStep = "playing_event_name";
          await attempt.save();
          await playbackIvrAudio(callControlId, eventNameUrl, {
            source: "invistimo-ivr",
            inbound_ivr: true,
            callAttemptId: String(attempt._id),
            stage: "inbound_play_after",
            voiceGender: gender,
          });
        }
        break;
      }

      if (
        !choiceTaken &&
        stage === "inbound_play_after" &&
        callControlId &&
        isInboundIvrAttempt(attempt)
      ) {
        const afterUrl = await getGlobalPackSegmentUrl(
          gender,
          "inboundAfterEventName"
        );
        if (afterUrl) {
          await gatherIvrUsingAudio({
            callControlId,
            audioUrl: afterUrl,
            minimumDigits: 1,
            maximumDigits: 1,
            validDigits: "123",
            timeoutMillis: 45000,
            clientState: {
              source: "invistimo-ivr",
              inbound_ivr: true,
              callAttemptId: String(attempt._id),
              stage: "choice",
              voiceGender: gender,
            },
          });
          attempt.flowStep = "gather_choice";
          await attempt.save();
        }
        break;
      }

      if (
        (stage === "hangup_after_thanks" ||
          stage === "hangup_after_system") &&
        callControlId
      ) {
        if (playbackStatus === "failed" && cleanStr(clientState.retry) !== "1") {
          const thanksKey =
            cleanStr(attempt.choiceDigit) === "1"
              ? "thanksAttending"
              : "thanksReceived";
          const retryUrl =
            stage === "hangup_after_thanks"
              ? await getIvrSystemAudioUrlForGender(gender, thanksKey)
              : "";
          if (retryUrl) {
            await playbackIvrAudio(callControlId, retryUrl, {
              ...clientState,
              retry: "1",
              stage,
            });
            break;
          }
        }
        if (
          playbackStatus &&
          playbackStatus !== "completed" &&
          playbackStatus !== "failed"
        ) {
          break;
        }
        if (
          stage === "hangup_after_system" &&
          isInboundIvrAttempt(attempt) &&
          !attempt.rsvpApplied
        ) {
          attempt.status = "unresolved";
          attempt.flowStep = "done";
          attempt.endedAt = attempt.endedAt || new Date();
          await attempt.save();
        }
        await hangupIvrCall(callControlId);
      }
      break;
    }

    case "call.hangup": {
      const cause = cleanStr(payload?.hangup_cause || payload?.state);
      attempt.hangupCause = cause;
      attempt.hangupSource = cleanStr(payload?.hangup_source);
      attempt.endedAt = attempt.endedAt || new Date();

      if (attempt.answeredAt && attempt.endedAt) {
        attempt.durationSeconds = Math.max(
          0,
          Math.round(
            (attempt.endedAt.getTime() - attempt.answeredAt.getTime()) / 1000
          )
        );
      }

      if (!attempt.rsvpApplied) {
        if (attempt.answered) {
          attempt.status = "hangup_before_response";
        } else if (
          cause.includes("busy") ||
          cause === "call_rejected" ||
          cause === "user_busy"
        ) {
          attempt.status = "busy";
        } else if (
          cause.includes("no_answer") ||
          cause === "timeout" ||
          cause === "originator_cancel"
        ) {
          attempt.status = "no_answer";
        } else if (cause.includes("voicemail") || cause.includes("machine")) {
          attempt.status = "voicemail";
        } else if (attempt.status !== "completed") {
          attempt.status = attempt.status === "failed" ? "failed" : "no_answer";
        }
        attempt.flowStep = "done";
      } else if (attempt.status !== "completed") {
        attempt.status = "completed";
        attempt.flowStep = "done";
      }

      await attempt.save();
      if (
        !isInboundIvrAttempt(attempt) &&
        attempt.userId &&
        attempt.invitationId &&
        [1, 2, 3].includes(Number(attempt.round))
      ) {
        await fillIvrRoundCapacity({
          userId: String(attempt.userId),
          invitationId: String(attempt.invitationId),
          round: Number(attempt.round),
        }).catch((error) => {
          console.error("IVR_FILL_AFTER_HANGUP", error);
        });
      }
      break;
    }

    case "call.machine.detection.ended": {
      const result = cleanStr(payload?.result || payload?.result_type);
      if (result.includes("machine") || result.includes("voice_mail")) {
        attempt.status = "voicemail";
        attempt.flowStep = "done";
        await attempt.save();
        if (callControlId) await hangupIvrCall(callControlId);
      }
      break;
    }

    default:
      await attempt.save();
      break;
  }

  return {
    ok: true,
    attemptId: String(attempt._id),
    callControlId: callControlId || cleanStr(attempt.telnyxCallControlId),
    eventType,
    status: attempt.status,
    rsvpApplied: attempt.rsvpApplied,
  };
  } finally {
    await noted;
  }
}
