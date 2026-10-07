/**
 * Resolve an inbound callback caller to a unique IVR InvitationGuest.
 * Only considers users with includeCalls + callsType === "ivr".
 * Never picks an arbitrary event when the phone matches multiple active IVR events.
 */

import User from "@/models/User";
import Invitation from "@/models/Invitation";
import InvitationGuest from "@/models/InvitationGuest";
import IvrCallAttempt from "@/models/IvrCallAttempt";
import { isIvrCallsUser } from "@/lib/calls/callsType";
import {
  resolveIvrEventName,
  resolveIvrEventNamePronunciation,
} from "@/lib/calls/ivrScript";
import {
  buildIvrPhoneMatchVariants,
  ivrPhoneNationalKey,
  phonesLikelyMatch,
} from "@/lib/calls/ivrPhoneMatch";
import { normalizePhoneForTelnyx } from "@/lib/telnyx/ivrCallControl";

export type IvrInboundCandidate = {
  guestId: string;
  invitationId: string;
  userId: string;
  phone: string;
  eventName: string;
  eventNamePronunciation: string;
  guestName: string;
};

export type IvrInboundResolveResult =
  | {
      status: "matched";
      candidate: IvrInboundCandidate;
      disambiguation: "unique" | "recent_outbound" | "event_name";
    }
  | {
      status: "ambiguous";
      candidates: IvrInboundCandidate[];
      reason: "MULTIPLE_ACTIVE_IVR_EVENTS";
    }
  | {
      status: "none";
      reason: "NO_IVR_GUEST" | "BAD_PHONE";
    };

function cleanStr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function invitationEventTitle(invitation: any) {
  return (
    cleanStr(invitation?.eventName) ||
    cleanStr(invitation?.eventTitle) ||
    cleanStr(invitation?.invitationTitle) ||
    cleanStr(invitation?.title) ||
    cleanStr(invitation?.name) ||
    cleanStr(invitation?.coupleName) ||
    ""
  );
}

/** Active = event date in the future, today, or within the last 14 days (still accepting RSVPs). */
export function isIvrInvitationActiveForInbound(
  invitation: { eventDate?: unknown } | null | undefined,
  now = new Date()
) {
  const raw = invitation?.eventDate;
  if (!raw) return true;
  const date = raw instanceof Date ? raw : new Date(String(raw));
  if (Number.isNaN(date.getTime())) return true;

  const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  cutoff.setHours(0, 0, 0, 0);
  return date.getTime() >= cutoff.getTime();
}

/**
 * Pure disambiguation among already-filtered IVR candidates.
 * Prefer the invitation tied to the most recent outbound IVR attempt for this phone.
 * If eventNameHint is provided and uniquely matches one candidate's event name, use it.
 */
export function disambiguateIvrInboundCandidates(input: {
  candidates: IvrInboundCandidate[];
  recentInvitationId?: string | null;
  eventNameHint?: string | null;
}): IvrInboundResolveResult {
  const candidates = Array.isArray(input.candidates) ? input.candidates : [];

  if (!candidates.length) {
    return { status: "none", reason: "NO_IVR_GUEST" };
  }

  if (candidates.length === 1) {
    return {
      status: "matched",
      candidate: candidates[0],
      disambiguation: "unique",
    };
  }

  const hint = cleanStr(input.eventNameHint);
  if (hint) {
    const byName = candidates.filter(
      (c) => cleanStr(c.eventName).toLowerCase() === hint.toLowerCase()
    );
    if (byName.length === 1) {
      return {
        status: "matched",
        candidate: byName[0],
        disambiguation: "event_name",
      };
    }
  }

  const recentId = cleanStr(input.recentInvitationId);
  if (recentId) {
    const byRecent = candidates.filter((c) => c.invitationId === recentId);
    if (byRecent.length === 1) {
      return {
        status: "matched",
        candidate: byRecent[0],
        disambiguation: "recent_outbound",
      };
    }
  }

  return {
    status: "ambiguous",
    candidates,
    reason: "MULTIPLE_ACTIVE_IVR_EVENTS",
  };
}

export async function resolveInboundIvrGuest(input: {
  fromPhone: string;
  eventNameHint?: string | null;
  now?: Date;
}): Promise<IvrInboundResolveResult> {
  const fromE164 = normalizePhoneForTelnyx(input.fromPhone);
  if (!fromE164) {
    return { status: "none", reason: "BAD_PHONE" };
  }

  const variants = buildIvrPhoneMatchVariants(fromE164);
  const nationalKey = ivrPhoneNationalKey(fromE164);

  // Broad fetch by exact variants; refine with national-key compare (format drift).
  const guests = (await InvitationGuest.find({
    phone: { $in: variants },
  })
    .select("_id invitationId name phone mobile phoneNumber")
    .lean()) as any[];

  // Also scan loose matches when exact $in misses (e.g. spaces / dashes stored oddly).
  // Keep this bounded: only if exact variants found nothing.
  let pool = guests;
  if (!pool.length && nationalKey) {
    const loose = (await InvitationGuest.find({
      phone: { $regex: `${nationalKey}$` },
    })
      .select("_id invitationId name phone mobile phoneNumber")
      .limit(50)
      .lean()) as any[];
    pool = loose.filter((g) =>
      phonesLikelyMatch(fromE164, g.phone || g.mobile || g.phoneNumber)
    );
  }

  if (!pool.length) {
    return { status: "none", reason: "NO_IVR_GUEST" };
  }

  const invitationIds = [
    ...new Set(pool.map((g) => String(g.invitationId || "")).filter(Boolean)),
  ];

  const invitations = (await Invitation.find({
    _id: { $in: invitationIds },
  })
    .select("_id ownerId title eventName eventTitle eventDate")
    .lean()) as any[];

  const invById = new Map(
    invitations.map((inv) => [String(inv._id), inv] as const)
  );

  const ownerIds = [
    ...new Set(
      invitations.map((inv) => String(inv.ownerId || "")).filter(Boolean)
    ),
  ];

  const owners = (await User.find({
    _id: { $in: ownerIds },
    includeCalls: true,
    callsType: "ivr",
  })
    .select("_id includeCalls callsType ivrConfig")
    .lean()) as any[];

  const ownerById = new Map(
    owners.filter((u) => isIvrCallsUser(u)).map((u) => [String(u._id), u] as const)
  );

  const now = input.now || new Date();
  const candidates: IvrInboundCandidate[] = [];

  for (const guest of pool) {
    const invitation = invById.get(String(guest.invitationId || ""));
    if (!invitation) continue;

    const owner = ownerById.get(String(invitation.ownerId || ""));
    if (!owner) continue;

    if (!isIvrInvitationActiveForInbound(invitation, now)) continue;

    const cfgEventName = resolveIvrEventName(owner?.ivrConfig);
    const eventName =
      cfgEventName || invitationEventTitle(invitation) || "האירוע";
    const eventNamePronunciation =
      resolveIvrEventNamePronunciation(owner?.ivrConfig) || "";

    candidates.push({
      guestId: String(guest._id),
      invitationId: String(invitation._id),
      userId: String(owner._id),
      phone: fromE164,
      eventName,
      eventNamePronunciation,
      guestName: cleanStr(guest.name),
    });
  }

  // Deduplicate by guestId (same guest row shouldn't appear twice).
  const uniqueByGuest = new Map<string, IvrInboundCandidate>();
  for (const c of candidates) {
    uniqueByGuest.set(c.guestId, c);
  }
  const uniqueCandidates = [...uniqueByGuest.values()];

  let recentInvitationId: string | null = null;
  if (uniqueCandidates.length > 1) {
    const candidateInvitationIds = uniqueCandidates.map((c) => c.invitationId);

    const recentByVariant = await IvrCallAttempt.findOne({
      phone: { $in: variants },
      channel: { $ne: "inbound_ivr" },
      invitationId: { $in: candidateInvitationIds },
    })
      .sort({ startedAt: -1, createdAt: -1 })
      .select("invitationId")
      .lean();

    if (recentByVariant?.invitationId) {
      recentInvitationId = String(recentByVariant.invitationId);
    } else {
      // Format drift: scan recent attempts for those invitations and match by national key.
      const recentList = (await IvrCallAttempt.find({
        invitationId: { $in: candidateInvitationIds },
        channel: { $ne: "inbound_ivr" },
      })
        .sort({ startedAt: -1, createdAt: -1 })
        .select("invitationId phone")
        .limit(40)
        .lean()) as any[];

      const hit = recentList.find((a) => phonesLikelyMatch(a.phone, fromE164));
      if (hit?.invitationId) {
        recentInvitationId = String(hit.invitationId);
      }
    }
  }

  return disambiguateIvrInboundCandidates({
    candidates: uniqueCandidates,
    recentInvitationId,
    eventNameHint: input.eventNameHint,
  });
}
