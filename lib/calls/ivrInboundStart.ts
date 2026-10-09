/**
 * Claim an inbound PSTN call for IVR callback (callsType=ivr only).
 * Separated from softphone routing — returns handled:false so human path continues.
 */

import { connectDB } from "@/lib/db";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import User from "@/models/User";
import {
  getAppBaseUrl,
  resolveIvrPublicAudioUrl,
} from "@/lib/calls/ivrAudioStorage";
import { resolveApprovedNarrationUrl } from "@/lib/calls/ivrDialer";
import { resolveInboundIvrGuest } from "@/lib/calls/ivrInboundResolve";
import { normalizeIvrVoiceGender } from "@/lib/calls/ivrScript";
import {
  getGlobalPackSegmentUrl,
  warmIvrChoiceFollowUps,
} from "@/lib/calls/ivrSystemAudio";
import {
  answerIvrCall,
  gatherIvrUsingAudio,
  hangupIvrCall,
  normalizePhoneForTelnyx,
  playbackIvrAudio,
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
      audioMode: "ai",
      timeline: [
        {
          at: new Date(),
          source: "server",
          kind: "inbound",
          label: "התקבלה שיחה נכנסת",
          detail: "AMBIGUOUS_EVENT",
          eventType: "",
          digit: "",
          stage: "",
        },
      ],
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

    const ambiguousUrl = await getGlobalPackSegmentUrl(
      "female",
      "inboundAmbiguous"
    );
    if (ambiguousUrl) {
      await playbackIvrAudio(callControlId, ambiguousUrl, {
        ...clientState,
        stage: "hangup_after_system",
      });
    } else {
      await hangupIvrCall(callControlId);
    }

    return {
      handled: true,
      reason: "AMBIGUOUS",
      attemptId: String(attempt._id),
    };
  }

  const { candidate, disambiguation } = resolved;
  const owner = await User.findById(candidate.userId)
    .select("ivrConfig callsType includeCalls")
    .lean();
  const ownerCfg = (owner as { ivrConfig?: any } | null)?.ivrConfig || {};
  const voiceGender = normalizeIvrVoiceGender(ownerCfg.voiceGender) || "female";
  const sharedNarrationUrl = resolveApprovedNarrationUrl(owner);
  const eventNameAudioUrl =
    ownerCfg.eventNameAudio?.status === "ready"
      ? resolveIvrPublicAudioUrl({
          publicToken: ownerCfg.eventNameAudio?.publicToken,
          storedUrl: ownerCfg.eventNameAudio?.audioUrl,
        })
      : "";

  const attempt = await IvrCallAttempt.create({
    userId: candidate.userId,
    invitationId: candidate.invitationId,
    guestId: candidate.guestId,
    phone: fromPhone,
    channel: "inbound_ivr",
    direction: "inbound",
    eventName: candidate.eventName,
    voiceGender,
    eventNameAudioUrl,
    introAudioUrl: sharedNarrationUrl,
    status: "initiated",
    flowStep: "playing_intro_before",
    answered: false,
    dtmfDigits: [],
    rsvpApplied: false,
    startedAt: new Date(),
    telnyxCallControlId: callControlId,
    telnyxCallLegId: cleanStr(params.callLegId),
    telnyxCallSessionId: cleanStr(params.callSessionId),
    telnyxConnectionId: cleanStr(params.connectionId),
    audioMode: "ai",
    timeline: [
      {
        at: new Date(),
        source: "server",
        kind: "inbound",
        label: "התקבלה שיחה נכנסת",
        detail: "",
        eventType: "",
        digit: "",
        stage: "",
      },
    ],
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

  void warmIvrChoiceFollowUps(voiceGender);

  await answerIvrCall(callControlId, {
    webhookUrl,
    clientState,
  });

  if (sharedNarrationUrl) {
    await gatherIvrUsingAudio({
      callControlId,
      audioUrl: sharedNarrationUrl,
      minimumDigits: 1,
      maximumDigits: 1,
      validDigits: "123",
      timeoutMillis: 45000,
      clientState: {
        source: "invistimo-ivr",
        inbound_ivr: true,
        callAttemptId: String(attempt._id),
        stage: "choice",
        voiceGender,
      },
    });
    attempt.flowStep = "gather_choice";
    attempt.introAudioUrl = sharedNarrationUrl;
    await attempt.save();
  } else {
    // The approved file is missing. Do not synthesize or stitch during the call.
    attempt.error = "AUDIO_NOT_READY";
    attempt.flowStep = "playing_system";
    attempt.rsvpApplied = false;
    await attempt.save();
    const noticeUrl = await getGlobalPackSegmentUrl(
      voiceGender,
      "introBeforeEventName"
    );
    if (noticeUrl) {
      await playbackIvrAudio(callControlId, noticeUrl, {
        source: "invistimo-ivr",
        inbound_ivr: true,
        callAttemptId: String(attempt._id),
        stage: "hangup_after_system",
        voiceGender,
      });
    } else {
      await hangupIvrCall(callControlId);
    }
  }

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
