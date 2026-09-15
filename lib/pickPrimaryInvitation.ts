import mongoose from "mongoose";

import Invitation from "@/models/Invitation";

export const PLACEHOLDER_INVITATION_TITLES = new Set([
  "",
  "הזמנה חדשה",
  "הזמנה חדשה (ארכיון — לא בשימוש)",
]);

export type PrimaryInvitationCandidate = {
  _id: unknown;
  title?: string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
  guestCount?: number;
};

type InvitationMatch = Record<string, any>;

export function isPlaceholderInvitationTitle(title: unknown): boolean {
  return PLACEHOLDER_INVITATION_TITLES.has(String(title || "").trim());
}

function toTime(value: unknown): number {
  if (!value) return 0;
  const ms = new Date(value as any).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Compare two invitations for "primary" selection.
 * Returns < 0 if `a` should rank above `b`.
 *
 * Priority:
 * 1) more real InvitationGuest docs
 * 2) non-placeholder title
 * 3) newer updatedAt
 * 4) newer createdAt
 */
export function comparePrimaryInvitations(
  a: PrimaryInvitationCandidate,
  b: PrimaryInvitationCandidate
): number {
  const guestsA = Math.max(0, Number(a.guestCount || 0));
  const guestsB = Math.max(0, Number(b.guestCount || 0));
  if (guestsB !== guestsA) return guestsB - guestsA;

  const placeholderA = isPlaceholderInvitationTitle(a.title) ? 1 : 0;
  const placeholderB = isPlaceholderInvitationTitle(b.title) ? 1 : 0;
  if (placeholderA !== placeholderB) return placeholderA - placeholderB;

  const updatedDiff = toTime(b.updatedAt) - toTime(a.updatedAt);
  if (updatedDiff !== 0) return updatedDiff;

  return toTime(b.createdAt) - toTime(a.createdAt);
}

export function pickPrimaryInvitation<T extends PrimaryInvitationCandidate>(
  invitations: T[]
): T | null {
  if (!Array.isArray(invitations) || invitations.length === 0) return null;

  let best = invitations[0];
  for (let i = 1; i < invitations.length; i++) {
    if (comparePrimaryInvitations(invitations[i], best) < 0) {
      best = invitations[i];
    }
  }
  return best;
}

export function buildActiveInvitationMatch(
  extra: InvitationMatch = {}
): InvitationMatch {
  return {
    eventId: { $ne: null },
    standaloneGame: { $ne: true },
    ...extra,
  };
}

/**
 * Picks the primary invitation for any match filter, ranked by real
 * InvitationGuest count (not invitation.guests[] length). No candidate
 * cap — safe for owners with many invitations.
 */
export async function findPrimaryInvitationId(
  match: InvitationMatch
): Promise<mongoose.Types.ObjectId | null> {
  const rows = await Invitation.aggregate<{ _id: mongoose.Types.ObjectId }>([
    { $match: match },
    {
      $lookup: {
        from: "invitationguests",
        let: { invitationId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$invitationId", "$$invitationId"] },
            },
          },
          { $count: "count" },
        ],
        as: "guestStats",
      },
    },
    {
      $addFields: {
        guestCount: {
          $ifNull: [{ $arrayElemAt: ["$guestStats.count", 0] }, 0],
        },
        isPlaceholder: {
          $in: [
            {
              $trim: {
                input: { $ifNull: ["$title", ""] },
              },
            },
            [...PLACEHOLDER_INVITATION_TITLES],
          ],
        },
      },
    },
    {
      $sort: {
        guestCount: -1,
        isPlaceholder: 1,
        updatedAt: -1,
        createdAt: -1,
      },
    },
    { $limit: 1 },
    { $project: { _id: 1 } },
  ]);

  return rows[0]?._id || null;
}

export async function findPrimaryInvitationLean(
  match: InvitationMatch
): Promise<any | null> {
  const id = await findPrimaryInvitationId(match);
  if (!id) return null;
  return Invitation.findById(id).lean();
}
