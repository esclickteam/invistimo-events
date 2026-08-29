import Invitation from "@/models/Invitation";
import User from "@/models/User";
import {
  featuresForExperience,
  guestExperienceFromRsvpSiteMode,
  normalizeGuestExperienceType,
  normalizeRsvpSiteMode,
  type GuestExperienceType,
  type RsvpSiteMode,
} from "@/types/rsvpSite";
import { createEmptyWeddingWebsite } from "@/lib/weddingWebsite/content";

export async function getOwnerRsvpSiteMode(ownerId: unknown): Promise<RsvpSiteMode> {
  if (!ownerId) return "standard";

  const user = await User.findById(ownerId)
    .select("rsvpSiteMode guestExperienceType features")
    .lean();

  return normalizeRsvpSiteMode(
    (user as { rsvpSiteMode?: unknown; guestExperienceType?: unknown } | null)
      ?.rsvpSiteMode ??
      (user as { guestExperienceType?: unknown } | null)?.guestExperienceType
  );
}

export function buildInvitationRsvpFields(
  rsvpSiteMode: RsvpSiteMode,
  invitation?: {
    title?: string;
    eventDate?: Date | string | null;
    eventTime?: string;
    location?: { name?: string; address?: string };
  } | null
) {
  const guestExperienceType = guestExperienceFromRsvpSiteMode(rsvpSiteMode);

  return {
    invitationSettings: {
      rsvpSiteMode,
      guestExperienceType,
    },
    ...(rsvpSiteMode === "personal"
      ? { weddingWebsite: createEmptyWeddingWebsite(invitation) }
      : {}),
  };
}

export async function applyUserRsvpSiteMode({
  userId,
  rsvpSiteMode,
  guestExperienceType,
}: {
  userId: string;
  rsvpSiteMode?: unknown;
  guestExperienceType?: unknown;
}) {
  const nextExperience: GuestExperienceType = normalizeGuestExperienceType(
    guestExperienceType ?? rsvpSiteMode
  );
  const nextMode = normalizeRsvpSiteMode(nextExperience);
  const features = featuresForExperience(nextExperience);

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        rsvpSiteMode: nextMode,
        guestExperienceType: nextExperience,
        "features.weddingWebsite": features.weddingWebsite,
        "features.guestMessages": features.guestMessages,
      },
    },
    { new: true }
  );

  if (!user) return null;

  const invitations = await Invitation.find({ ownerId: userId }).select(
    "title eventDate eventTime location weddingWebsite invitationSettings"
  );

  for (const invitation of invitations) {
    invitation.set("invitationSettings.rsvpSiteMode", nextMode);
    invitation.set("invitationSettings.guestExperienceType", nextExperience);

    if (nextMode === "personal" && !invitation.weddingWebsite?.templateId) {
      invitation.set("weddingWebsite", createEmptyWeddingWebsite(invitation));
    }

    await invitation.save();
  }

  return {
    user,
    rsvpSiteMode: nextMode,
    guestExperienceType: nextExperience,
    features,
    invitationsUpdated: invitations.length,
  };
}
