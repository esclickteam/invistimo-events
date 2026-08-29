import Invitation from "@/models/Invitation";
import User from "@/models/User";
import {
  normalizeRsvpSiteMode,
  type RsvpSiteMode,
} from "@/types/rsvpSite";
import { createEmptyWeddingWebsite } from "@/lib/weddingWebsite/content";

export async function getOwnerRsvpSiteMode(ownerId: unknown): Promise<RsvpSiteMode> {
  if (!ownerId) return "standard";

  const user = await User.findById(ownerId).select("rsvpSiteMode").lean();
  return normalizeRsvpSiteMode((user as { rsvpSiteMode?: unknown } | null)?.rsvpSiteMode);
}

export function buildInvitationRsvpFields(rsvpSiteMode: RsvpSiteMode, invitation?: {
  title?: string;
  eventDate?: Date | string | null;
  eventTime?: string;
  location?: { name?: string; address?: string };
} | null) {
  return {
    invitationSettings: {
      rsvpSiteMode,
    },
    ...(rsvpSiteMode === "personal"
      ? { weddingWebsite: createEmptyWeddingWebsite(invitation) }
      : {}),
  };
}

export async function applyUserRsvpSiteMode({
  userId,
  rsvpSiteMode,
}: {
  userId: string;
  rsvpSiteMode: unknown;
}) {
  const nextMode = normalizeRsvpSiteMode(rsvpSiteMode);

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { rsvpSiteMode: nextMode } },
    { new: true }
  );

  if (!user) return null;

  const invitations = await Invitation.find({ ownerId: userId }).select(
    "title eventDate eventTime location weddingWebsite invitationSettings"
  );

  for (const invitation of invitations) {
    invitation.set("invitationSettings.rsvpSiteMode", nextMode);

    if (nextMode === "personal" && !invitation.weddingWebsite?.templateId) {
      invitation.set("weddingWebsite", createEmptyWeddingWebsite(invitation));
    }

    await invitation.save();
  }

  return {
    user,
    rsvpSiteMode: nextMode,
    invitationsUpdated: invitations.length,
  };
}
