/**
 * IVR Call Control webhook processing — idempotent RSVP updates.
 */

import IvrCallAttempt from "@/models/IvrCallAttempt";
import InvitationGuest from "@/models/InvitationGuest";
import {
  applyIvrRsvpToGuest,
  parseDtmfGuestCount,
} from "@/lib/calls/ivrApplyRsvp";
import { getGuestMaxAttendingCount } from "@/lib/calls/ivrRoundEligibility";
import { getIvrSystemAudioUrl } from "@/lib/calls/ivrSystemAudio";
import {
  answerIvrCall,
  decodeIvrClientState,
  gatherIvrUsingAudio,
  hangupIvrCall,
  playbackIvrAudio,
} from "@/lib/telnyx/ivrCallControl";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

  // null → already processed (idempotent skip)
  return Boolean(updated);
}

async function findAttemptFromEvent(body: any) {
  const payload = getPayload(body);
  const clientState = decodeIvrClientState(payload?.client_state);
  const attemptId = cleanStr(
    clientState.callAttemptId ||
      clientState.call_attempt_id ||
      ""
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

  // Atomic claim to prevent double RSVP from concurrent webhooks.
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

  // Keep Telnyx ids in sync.
  if (callControlId && !attempt.telnyxCallControlId) {
    attempt.telnyxCallControlId = callControlId;
  }
  if (payload?.call_leg_id) {
    attempt.telnyxCallLegId = cleanStr(payload.call_leg_id);
  }
  if (payload?.call_session_id) {
    attempt.telnyxCallSessionId = cleanStr(payload.call_session_id);
  }

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
      attempt.status = "answered";
      attempt.answered = true;
      attempt.answeredAt = attempt.answeredAt || new Date();
      attempt.flowStep = "playing_intro";
      await attempt.save();

      if (callControlId) {
        await answerIvrCall(callControlId).catch(() => null);

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

          const invalidUrl = await getIvrSystemAudioUrl("invalidGuestCount");
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

        const thanksUrl = await getIvrSystemAudioUrl("thanksAttending");
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

      // Choice stage (1/2/3)
      attempt.choiceDigit = digits.slice(0, 1);
      await attempt.save();

      if (attempt.choiceDigit === "1") {
        const askUrl = await getIvrSystemAudioUrl("askGuestCount");
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
        const thanksUrl = await getIvrSystemAudioUrl("thanksReceived");
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
        const thanksUrl = await getIvrSystemAudioUrl("thanksReceived");
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

      // Invalid choice — retry once
      attempt.status = "invalid_input";
      const invalidUrl = await getIvrSystemAudioUrl("invalidInput");
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

    case "call.playback.ended": {
      const stage = cleanStr(
        decodeIvrClientState(payload?.client_state).stage
      );
      if (stage === "hangup_after_thanks" && callControlId) {
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
      // Optional AMD — mark voicemail if detected and hang up without RSVP.
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
