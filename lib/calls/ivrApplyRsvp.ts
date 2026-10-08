/**
 * Apply IVR DTMF result onto the existing InvitationGuest RSVP fields.
 * Uses the same rsvp / arrivedCount fields as WhatsApp, personal link, admin, employees.
 */

import InvitationGuest from "@/models/InvitationGuest";
import {
  getGuestMaxAttendingCount,
  parseDtmfGuestCount,
} from "@/lib/calls/ivrRoundEligibility";
import type { IvrRsvpResult } from "@/models/IvrCallAttempt";

export { parseDtmfGuestCount };

export async function applyIvrRsvpToGuest(input: {
  guestId: string;
  invitationId: string;
  rsvp: Exclude<IvrRsvpResult, null>;
  attendingCount?: number | null;
  respondedAt?: Date | null;
  round?: number | null;
  callAttemptId?: string;
  callControlId?: string;
}) {
  const guest = await InvitationGuest.findOne({
    _id: input.guestId,
    invitationId: input.invitationId,
  });

  if (!guest) {
    throw new Error("GUEST_NOT_FOUND");
  }

  const maxCount = getGuestMaxAttendingCount(guest);
  const set: Record<string, unknown> = {
    rsvp: input.rsvp,
    status: input.rsvp,
    ivrResponse: {
      respondedAt: input.respondedAt || new Date(),
      round: input.round ?? null,
      callAttemptId: String(input.callAttemptId || ""),
      callControlId: String(input.callControlId || ""),
    },
  };

  if (input.rsvp === "yes") {
    const count = Math.min(
      Math.max(1, Math.floor(Number(input.attendingCount) || 1)),
      maxCount
    );
    set.arrivedCount = count;
    set.amount = count;
  } else if (input.rsvp === "no") {
    set.arrivedCount = 0;
    set.amount = 0;
  }
  // maybe: leave attending count untouched (or zero? human sets 0 for undecided in some paths)
  // Spec: only update RSVP = undecided — do not force count.

  const updated = await InvitationGuest.findOneAndUpdate(
    {
      _id: input.guestId,
      invitationId: input.invitationId,
    },
    { $set: set },
    { new: true }
  );

  return {
    guest: updated,
    maxCount,
    applied: {
      rsvp: input.rsvp,
      arrivedCount: set.arrivedCount ?? updated?.arrivedCount ?? null,
    },
  };
}

