/**
 * IVR Call Control webhook processing — idempotent RSVP updates.
 *
 * AI outbound intro plays three clips in sequence:
 * global.introBeforeEventName → event.eventNameAudio → global.introAfterEventName (gather)
 * DTMF follow-ups use the same global gender pack.
 */

import IvrCallAttempt from "@/models/IvrCallAttempt";
import InvitationGuest from "@/models/InvitationGuest";
import {
  applyIvrRsvpToGuest,
  parseDtmfGuestCount,
} from "@/lib/calls/ivrApplyRsvp";
import { getGuestMaxAttendingCount } from "@/lib/calls/ivrRoundEligibility";
import {
  ensureIvrInboundIntroAudio,
  getGlobalPackSegmentUrl,
  getIvrSystemAudioUrlForGender,
} from "@/lib/calls/ivrSystemAudio";
import {
  buildIvrInboundIntroText,
  normalizeIvrVoiceGender,
  type IvrVoiceGender,
} from "@/lib/calls/ivrScript";
import {
  answerIvrCall,
  decodeIvrClientState,
  gatherIvrUsingAudio,
  gatherIvrUsingSpeak,
  hangupIvrCall,
  playbackIvrAudio,
} from "@/lib/telnyx/ivrCallControl";

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
  const eventName = cleanStr(input.attempt.eventName) || "האירוע";
  const introText = buildIvrInboundIntroText({ eventName });
  const gender = attemptVoiceGender(input.attempt);
  const eventNameUrl = cleanStr(input.attempt.eventNameAudioUrl);

  // Prefer global inbound pack + per-event name (no full-intro re-TTS).
  if (eventNameUrl) {
    try {
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
          stage: "inbound_play_event_name",
          voiceGender: gender,
        });
        return;
      }
    } catch (error) {
      console.warn("INBOUND_IVR_PACK_FALLBACK", {
        attemptId: String(input.attempt._id),
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  try {
    const audio = await ensureIvrInboundIntroAudio({ eventName });
    const introUrl = cleanStr(audio?.audioUrl);
    if (introUrl) {
      await gatherIvrUsingAudio({
        callControlId: input.callControlId,
        audioUrl: introUrl,
        minimumDigits: 1,
        maximumDigits: 1,
        validDigits: "123",
        timeoutMillis: 12000,
        clientState: {
          source: "invistimo-ivr",
          inbound_ivr: true,
          channel: "inbound_ivr",
          callAttemptId: String(input.attempt._id),
          stage: "choice",
        },
      });
      return;
    }
  } catch (error) {
    console.warn("INBOUND_IVR_INTRO_AUDIO_FALLBACK_SPEAK", {
      attemptId: String(input.attempt._id),
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  await gatherIvrUsingSpeak({
    callControlId: input.callControlId,
    text: introText,
    minimumDigits: 1,
    maximumDigits: 1,
    validDigits: "123",
    timeoutMillis: 12000,
    clientState: {
      source: "invistimo-ivr",
      inbound_ivr: true,
      channel: "inbound_ivr",
      callAttemptId: String(input.attempt._id),
      stage: "choice",
    },
  });
}

/** Start AI intro: prefer seamless composed file; else sequential before→name→after. */
async function startOutboundAiIntro(input: {
  attempt: any;
  callControlId: string;
}) {
  const gender = attemptVoiceGender(input.attempt);
  // Dialer stores composedIntro on introAudioUrl for AI mode (single continuous file).
  const composedUrl = cleanStr(input.attempt.introAudioUrl);
  const eventNameUrl = cleanStr(input.attempt.eventNameAudioUrl);

  if (composedUrl && eventNameUrl) {
    await gatherIvrUsingAudio({
      callControlId: input.callControlId,
      audioUrl: composedUrl,
      minimumDigits: 1,
      maximumDigits: 1,
      validDigits: "123",
      timeoutMillis: 12000,
      clientState: {
        source: "invistimo-ivr",
        callAttemptId: String(input.attempt._id),
        stage: "choice",
        seamlessCompose: true,
      },
    });
    input.attempt.flowStep = "gather_choice";
    await input.attempt.save();
    return;
  }

  const beforeUrl = await getGlobalPackSegmentUrl(
    gender,
    "introBeforeEventName"
  );

  if (!beforeUrl || !eventNameUrl) {
    if (composedUrl) {
      await gatherIvrUsingAudio({
        callControlId: input.callControlId,
        audioUrl: composedUrl,
        minimumDigits: 1,
        maximumDigits: 1,
        validDigits: "123",
        timeoutMillis: 12000,
        clientState: {
          source: "invistimo-ivr",
          callAttemptId: String(input.attempt._id),
          stage: "choice",
        },
      });
      input.attempt.flowStep = "gather_choice";
      await input.attempt.save();
      return;
    }
    throw new Error("IVR_INTRO_SEGMENTS_MISSING");
  }

  input.attempt.flowStep = "playing_intro_before";
  await input.attempt.save();

  await playbackIvrAudio(input.callControlId, beforeUrl, {
    source: "invistimo-ivr",
    callAttemptId: String(input.attempt._id),
    stage: "play_event_name",
    voiceGender: gender,
  });
}

async function continueOutboundAiIntro(input: {
  attempt: any;
  callControlId: string;
  stage: string;
}) {
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

    await gatherIvrUsingAudio({
      callControlId: input.callControlId,
      audioUrl: afterUrl,
      minimumDigits: 1,
      maximumDigits: 1,
      validDigits: "123",
      timeoutMillis: 12000,
      clientState: {
        source: "invistimo-ivr",
        callAttemptId: String(input.attempt._id),
        stage: "choice",
        voiceGender: gender,
      },
    });

    input.attempt.flowStep = "gather_choice";
    await input.attempt.save();
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
        flowStep: "done",
      },
    },
    { new: true }
  );

  if (!claimed) {
    return { applied: false, reason: "race_already_applied" };
  }

  await applyIvrRsvpToGuest({
    guestId: String(claimed.guestId),
    invitationId: String(claimed.invitationId),
    rsvp: input.rsvp,
    attendingCount: input.attendingCount,
  });

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
      if (
        isInboundIvrAttempt(attempt) &&
        (attempt.status === "unresolved" ||
          cleanStr(attempt.error) === "AMBIGUOUS_EVENT")
      ) {
        attempt.answered = true;
        attempt.answeredAt = attempt.answeredAt || new Date();
        await attempt.save();
        break;
      }

      if (
        isInboundIvrAttempt(attempt) &&
        (attempt.flowStep === "gather_choice" ||
          attempt.flowStep === "gather_count" ||
          attempt.flowStep === "playing_ask_count" ||
          attempt.rsvpApplied)
      ) {
        attempt.answered = true;
        attempt.answeredAt = attempt.answeredAt || new Date();
        if (attempt.status !== "completed") {
          attempt.status = "answered";
        }
        await attempt.save();
        break;
      }

      attempt.status = "answered";
      attempt.answered = true;
      attempt.answeredAt = attempt.answeredAt || new Date();
      attempt.flowStep = "playing_intro";
      await attempt.save();

      if (callControlId) {
        if (!isInboundIvrAttempt(attempt)) {
          await answerIvrCall(callControlId).catch(() => null);
        }

        if (isInboundIvrAttempt(attempt)) {
          await playInboundChoiceGather({ attempt, callControlId });
          attempt.flowStep = "gather_choice";
          await attempt.save();
          break;
        }

        // AI sequential pack intro, or legacy/self-recorded single file.
        if (cleanStr(attempt.eventNameAudioUrl)) {
          await startOutboundAiIntro({ attempt, callControlId });
        } else {
          const introUrl = cleanStr(attempt.introAudioUrl);
          if (introUrl) {
            await gatherIvrUsingAudio({
              callControlId,
              audioUrl: introUrl,
              minimumDigits: 1,
              maximumDigits: 1,
              validDigits: "123",
              timeoutMillis: 12000,
              clientState: {
                source: "invistimo-ivr",
                callAttemptId: String(attempt._id),
                stage: "choice",
              },
            });
            attempt.flowStep = "gather_choice";
            await attempt.save();
          }
        }
      }
      break;
    }

    case "call.gather.ended": {
      const digits = cleanStr(
        payload?.digits || payload?.digit || payload?.result
      );
      if (digits) {
        attempt.dtmfDigits = [...(attempt.dtmfDigits || []), digits];
      }

      const stage = cleanStr(
        decodeIvrClientState(payload?.client_state).stage
      );

      if (stage === "count" || attempt.flowStep === "gather_count") {
        attempt.guestCountDigits = digits;
        const guest = await InvitationGuest.findById(attempt.guestId).lean();
        const maxCount = getGuestMaxAttendingCount(guest);
        const parsed = parseDtmfGuestCount(digits, maxCount);

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
              maximumDigits: 2,
              terminatingDigit: "#",
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

        await applyRsvpOnce({
          attempt,
          rsvp: "yes",
          attendingCount: parsed.count,
        });

        const thanksUrl = await getIvrSystemAudioUrlForGender(
          gender,
          "thanksAttending"
        );
        if (callControlId && thanksUrl) {
          attempt.flowStep = "playing_thanks";
          await attempt.save();
          await playbackIvrAudio(callControlId, thanksUrl, {
            source: "invistimo-ivr",
            callAttemptId: String(attempt._id),
            stage: "hangup_after_thanks",
          });
        } else if (callControlId) {
          await hangupIvrCall(callControlId);
        }
        break;
      }

      attempt.choiceDigit = digits.slice(0, 1);
      await attempt.save();

      if (attempt.choiceDigit === "1") {
        const askUrl = await getIvrSystemAudioUrlForGender(
          gender,
          "askGuestCount"
        );
        attempt.flowStep = "playing_ask_count";
        await attempt.save();

        if (callControlId && askUrl) {
          await gatherIvrUsingAudio({
            callControlId,
            audioUrl: askUrl,
            minimumDigits: 1,
            maximumDigits: 2,
            terminatingDigit: "#",
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

      if (attempt.choiceDigit === "2") {
        await applyRsvpOnce({
          attempt,
          rsvp: "no",
          attendingCount: 0,
        });
        const thanksUrl = await getIvrSystemAudioUrlForGender(
          gender,
          "thanksReceived"
        );
        if (callControlId && thanksUrl) {
          attempt.flowStep = "playing_thanks";
          await attempt.save();
          await playbackIvrAudio(callControlId, thanksUrl, {
            source: "invistimo-ivr",
            callAttemptId: String(attempt._id),
            stage: "hangup_after_thanks",
          });
        } else if (callControlId) {
          await hangupIvrCall(callControlId);
        }
        break;
      }

      if (attempt.choiceDigit === "3") {
        await applyRsvpOnce({
          attempt,
          rsvp: "maybe",
        });
        const thanksUrl = await getIvrSystemAudioUrlForGender(
          gender,
          "thanksReceived"
        );
        if (callControlId && thanksUrl) {
          attempt.flowStep = "playing_thanks";
          await attempt.save();
          await playbackIvrAudio(callControlId, thanksUrl, {
            source: "invistimo-ivr",
            callAttemptId: String(attempt._id),
            stage: "hangup_after_thanks",
          });
        } else if (callControlId) {
          await hangupIvrCall(callControlId);
        }
        break;
      }

      attempt.status = "invalid_input";
      const invalidUrl = await getIvrSystemAudioUrlForGender(
        gender,
        "invalidInput"
      );
      if (callControlId && invalidUrl) {
        await gatherIvrUsingAudio({
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
        });
        attempt.flowStep = "gather_choice";
        await attempt.save();
      }
      break;
    }

    case "call.playback.ended":
    case "call.speak.ended": {
      const stage = cleanStr(
        decodeIvrClientState(payload?.client_state).stage
      );

      if (
        (stage === "play_event_name" || stage === "play_intro_after") &&
        callControlId &&
        !isInboundIvrAttempt(attempt)
      ) {
        await continueOutboundAiIntro({ attempt, callControlId, stage });
        break;
      }

      if (
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
            timeoutMillis: 12000,
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
      break;
    }

    case "call.machine.detection.ended": {
      const result = cleanStr(payload?.result || payload?.result_type);
      if (result.includes("machine") || result.includes("voice_mail")) {
        attempt.status = "voicemail";
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
    eventType,
    status: attempt.status,
    rsvpApplied: attempt.rsvpApplied,
  };
}
