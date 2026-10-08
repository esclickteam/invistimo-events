/**
 * Claim an inbound PSTN call for IVR callback (callsType=ivr only).
 * Separated from softphone routing — returns handled:false so human path continues.
 */

import { connectDB } from "@/lib/db";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import { getAppBaseUrl } from "@/lib/calls/ivrAudioStorage";
import { resolveInboundIvrGuest } from "@/lib/calls/ivrInboundResolve";
import {
  buildIvrInboundIntroText,
  IVR_SYSTEM_PROMPTS,
} from "@/lib/calls/ivrScript";
import { ensureIvrInboundIntroAudio } from "@/lib/calls/ivrSystemAudio";
import {
  answerIvrCall,
  gatherIvrUsingAudio,
  gatherIvrUsingSpeak,
  hangupIvrCall,
  normalizePhoneForTelnyx,
  speakIvrCall,
} from "@/lib/telnyx/ivrCallControl";
import {
  getConfiguredInvistimoDid,
  isRoutablePstnInboundLeg,
} from "@/lib/telnyx/inboundBridgeState";

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getIvrWebhookUrl() {
  const explicit = cleanStr(process.env.TELNYX_IVR_WEBHOOK_URL);
  if (explicit) return explicit;
  const base = getAppBaseUrl();
  return base ? `${base}/api/telnyx/ivr/webhook` : "";
}

export type InboundIvrStartResult =
  | {
      handled: true;
      reason: "MATCHED" | "AMBIGUOUS";
      attemptId?: string;
      guestId?: string;
      invitationId?: string;
      userId?: string;
      eventName?: string;
      disambiguation?: string;
    }
  | {
      handled: false;
      reason: string;
    };

/**
 * Try to start inbound IVR for a softphone-webhook call.initiated.
 * Only claims the call when the caller uniquely maps to an active IVR guest
 * (or needs an ambiguous-event system message). Human / unknown callers → not handled.
 */
export async function tryStartInboundIvr(params: {
  callControlId: string;
  from: string;
  to: string;
  callLegId?: string;
  callSessionId?: string;
  connectionId?: string;
  inbound?: boolean;
  direction?: string;
  clientState?: Record<string, unknown> | null;
  bridgeIntent?: boolean | null;
}): Promise<InboundIvrStartResult> {
  const callControlId = cleanStr(params.callControlId);
  if (!callControlId) {
    return { handled: false, reason: "CALL_CONTROL_ID_MISSING" };
  }

  // Same hard gate as softphone: only Invistimo DID PSTN root inbound legs.
  const routable = isRoutablePstnInboundLeg({
    connectionId: params.connectionId,
    direction: params.direction,
    inbound: params.inbound,
    from: params.from,
    to: params.to,
    clientState: params.clientState,
    bridgeIntent: params.bridgeIntent,
    invistimoDid: getConfiguredInvistimoDid(),
  });

  if (!routable.ok) {
    return { handled: false, reason: `NOT_ROUTABLE:${routable.reason}` };
  }

  const fromPhone = normalizePhoneForTelnyx(params.from);
  if (!fromPhone) {
    return { handled: false, reason: "BAD_FROM_PHONE" };
  }

  await connectDB();

  // Idempotency: already claimed this call control id for inbound IVR.
  const existing = await IvrCallAttempt.findOne({
    telnyxCallControlId: callControlId,
    channel: "inbound_ivr",
  })
    .select("_id status guestId invitationId")
    .lean();

  if (existing) {
    return {
      handled: true,
      reason: "MATCHED",
      attemptId: String(existing._id),
      guestId: existing.guestId ? String(existing.guestId) : undefined,
      invitationId: existing.invitationId
        ? String(existing.invitationId)
        : undefined,
    };
  }

  const resolved = await resolveInboundIvrGuest({ fromPhone });

  if (resolved.status === "none") {
    // Not an IVR guest — leave the call for softphone / human routing.
    return { handled: false, reason: resolved.reason };
  }

  const webhookUrl = getIvrWebhookUrl();
  if (!webhookUrl) {
    console.error("INBOUND_IVR_WEBHOOK_URL_MISSING");
    return { handled: false, reason: "IVR_WEBHOOK_URL_MISSING" };
  }

  if (resolved.status === "ambiguous") {
    // Claim the call so softphone does not bridge; do not update any RSVP.
    const attempt = await IvrCallAttempt.create({
      userId: resolved.candidates[0]?.userId,
      invitationId: resolved.candidates[0]?.invitationId,
      guestId: resolved.candidates[0]?.guestId,
      phone: fromPhone,
      channel: "inbound_ivr",
      direction: "inbound",
      eventName: "",
      status: "unresolved",
      flowStep: "playing_system",
      answered: false,
      dtmfDigits: [],
      rsvpApplied: false,
      startedAt: new Date(),
      telnyxCallControlId: callControlId,
      telnyxCallLegId: cleanStr(params.callLegId),
      telnyxCallSessionId: cleanStr(params.callSessionId),
      telnyxConnectionId: cleanStr(params.connectionId),
      error: "AMBIGUOUS_EVENT",
    });

    const clientState = {
      source: "invistimo-ivr",
      ivr: true,
      inbound_ivr: true,
      channel: "inbound_ivr",
      callAttemptId: String(attempt._id),
      call_attempt_id: String(attempt._id),
      stage: "ambiguous_hangup",
    };

    await answerIvrCall(callControlId, {
      webhookUrl,
      clientState,
    });

    await speakIvrCall(
      callControlId,
      IVR_SYSTEM_PROMPTS.inboundAmbiguous,
      {
        ...clientState,
        stage: "hangup_after_system",
      }
    );

    return {
      handled: true,
      reason: "AMBIGUOUS",
      attemptId: String(attempt._id),
    };
  }

  const { candidate, disambiguation } = resolved;

  const attempt = await IvrCallAttempt.create({
    userId: candidate.userId,
    invitationId: candidate.invitationId,
    guestId: candidate.guestId,
    phone: fromPhone,
    channel: "inbound_ivr",
    direction: "inbound",
    eventName: candidate.eventName,
    status: "initiated",
    flowStep: "playing_intro",
    answered: false,
    dtmfDigits: [],
    rsvpApplied: false,
    startedAt: new Date(),
    telnyxCallControlId: callControlId,
    telnyxCallLegId: cleanStr(params.callLegId),
    telnyxCallSessionId: cleanStr(params.callSessionId),
    telnyxConnectionId: cleanStr(params.connectionId),
  });

  const clientState = {
    source: "invistimo-ivr",
    ivr: true,
    inbound_ivr: true,
    channel: "inbound_ivr",
    callAttemptId: String(attempt._id),
    call_attempt_id: String(attempt._id),
    userId: candidate.userId,
    invitationId: candidate.invitationId,
    guestId: candidate.guestId,
    event_id: candidate.invitationId,
    guest_id: candidate.guestId,
    eventName: candidate.eventName,
    stage: "inbound_start",
  };

  await answerIvrCall(callControlId, {
    webhookUrl,
    clientState,
  });

  // Start gather immediately after answer; IVR webhook also handles call.answered
  // idempotently if flowStep is already gather_choice.
  const choiceState = {
    source: "invistimo-ivr",
    ivr: true,
    inbound_ivr: true,
    channel: "inbound_ivr",
    callAttemptId: String(attempt._id),
    call_attempt_id: String(attempt._id),
    stage: "choice",
  };

  try {
    const audio = await ensureIvrInboundIntroAudio({
      eventName: candidate.eventName,
      eventNamePronunciation: candidate.eventNamePronunciation,
    });
    const introUrl = cleanStr(audio?.audioUrl);
    if (introUrl) {
      await gatherIvrUsingAudio({
        callControlId,
        audioUrl: introUrl,
        minimumDigits: 1,
        maximumDigits: 1,
        validDigits: "123",
        timeoutMillis: 12000,
        clientState: choiceState,
      });
    } else {
      throw new Error("INBOUND_INTRO_URL_EMPTY");
    }
  } catch (error) {
    console.warn("INBOUND_IVR_INTRO_AUDIO_FALLBACK_SPEAK", {
      attemptId: String(attempt._id),
      message: error instanceof Error ? error.message : "unknown",
    });
    await gatherIvrUsingSpeak({
      callControlId,
      text: buildIvrInboundIntroText({
        eventName: candidate.eventName,
        eventNamePronunciation: candidate.eventNamePronunciation,
      }),
      minimumDigits: 1,
      maximumDigits: 1,
      validDigits: "123",
      timeoutMillis: 12000,
      clientState: choiceState,
    });
  }

  await IvrCallAttempt.updateOne(
    { _id: attempt._id },
    {
      $set: {
        status: "answered",
        answered: true,
        answeredAt: new Date(),
        flowStep: "gather_choice",
        introAudioUrl: "",
      },
    }
  );

  console.log("INBOUND_IVR_CLAIMED", {
    attemptId: String(attempt._id),
    guestId: candidate.guestId,
    invitationId: candidate.invitationId,
    userId: candidate.userId,
    eventName: candidate.eventName,
    disambiguation,
    fromPhone,
    to: params.to,
  });

  return {
    handled: true,
    reason: "MATCHED",
    attemptId: String(attempt._id),
    guestId: candidate.guestId,
    invitationId: candidate.invitationId,
    userId: candidate.userId,
    eventName: candidate.eventName,
    disambiguation,
  };
}

/** Used by IVR webhook after ambiguous system speak ends. */
export async function hangupInboundIvrIfNeeded(callControlId: string) {
  if (!callControlId) return;
  await hangupIvrCall(callControlId).catch(() => null);
}
