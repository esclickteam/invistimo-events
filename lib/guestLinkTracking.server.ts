import InvitationGuest from "@/models/InvitationGuest";
import {
  LINK_OPEN_DEDUP_MS,
  nextGuestLinkOpenState,
  shouldSkipGuestLinkTracking,
} from "@/lib/guestLinkTracking";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Best-effort write. Never throws to callers.
 * Server-only: do not import this module from client components.
 * Does not touch RSVP, notes, seating, or updatedAt.
 *
 * Writes only on a counted open:
 * - first open: firstOpenedAt + lastOpenedAt + openCount=1
 * - after the 5-minute window: lastOpenedAt + $inc openCount
 * Refreshes inside the window do not call updateOne at all.
 *
 * Counted writes are filtered atomically so parallel opens of the same
 * token cannot double-count or clobber a newer lastOpenedAt.
 */
export async function recordGuestLinkOpen(input: {
  token?: string | null;
  invitationId?: unknown;
  userAgent?: string | null;
  isPreview?: boolean;
  purpose?: string | null;
}): Promise<boolean> {
  try {
    const token = String(input.token || "").trim();
    if (
      shouldSkipGuestLinkTracking({
        token,
        userAgent: input.userAgent,
        isPreview: input.isPreview,
        purpose: input.purpose,
      })
    ) {
      return false;
    }

    if (!input.invitationId) return false;

    const guest = await InvitationGuest.findOne({
      token,
      invitationId: input.invitationId,
    })
      .select("_id firstOpenedAt lastOpenedAt openCount")
      .lean();

    if (!guest?._id) return false;

    const now = new Date();
    const next = nextGuestLinkOpenState(guest, now);
    if (!next.write) return true;

    if (!toDate(guest.firstOpenedAt)) {
      await InvitationGuest.updateOne(
        {
          _id: guest._id,
          $or: [{ firstOpenedAt: null }, { firstOpenedAt: { $exists: false } }],
        },
        {
          $set: {
            firstOpenedAt: next.firstOpenedAt,
            lastOpenedAt: next.lastOpenedAt,
            openCount: 1,
          },
        },
        { timestamps: false }
      );
      return true;
    }

    const cutoff = new Date(now.getTime() - LINK_OPEN_DEDUP_MS);
    await InvitationGuest.updateOne(
      {
        _id: guest._id,
        lastOpenedAt: { $type: "date", $lte: cutoff },
      },
      {
        $set: { lastOpenedAt: now },
        $inc: { openCount: 1 },
      },
      { timestamps: false }
    );

    return true;
  } catch (error) {
    console.warn("[guest-link-open] best-effort skipped", error);
    return false;
  }
}
